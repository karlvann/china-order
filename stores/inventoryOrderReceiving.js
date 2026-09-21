export const useInventoryOrderReceivingStore = defineStore('inventoryOrderReceiving', () => {
  const { getItems, updateItem, deleteItems } = useDirectusItems()
  const { handleDirectusAuthError, getDirectusErrorMessage } = useDirectusSession()

  const applyingOrderId = ref(null)
  const error = ref(null)

  const isApplyingOrder = (orderId) => {
    return String(applyingOrderId.value) === String(orderId)
  }

  const logFailureSummary = (orderId, orderLocation, failed, applied, notAttempted, failure) => {
    console.error(`[Inventory order ${orderId}] Failed to apply ${failed?.sku || 'order'}`, {
      orderId,
      orderLocation,
      failed,
      applied,
      notAttempted,
      error: failure
    })
  }

  const applyOrderToInventory = async (orderId) => {
    if (applyingOrderId.value !== null) {
      return {
        success: false,
        error: new Error('An inventory order is already being applied')
      }
    }

    applyingOrderId.value = orderId
    error.value = null

    const applied = []
    let operations = []
    let orderLocation = null

    try {
      const orderResponse = await getItems({
        collection: 'inventory_orders',
        params: {
          filter: {
            id: { _eq: orderId }
          },
          fields: [
            'id',
            'ordered',
            'order_location',
            'skus.skus_id.id',
            'skus.skus_id.sku',
            'skus.quantity'
          ],
          deep: {
            skus: {
              _limit: -1
            }
          },
          limit: 1
        }
      })

      const orders = Array.isArray(orderResponse) ? orderResponse : (orderResponse?.data || [])
      const order = orders[0]

      if (!order) {
        throw new Error('Inventory order not found')
      }

      if (order.ordered !== true && order.ordered !== 1 && order.ordered !== 'true') {
        throw new Error('The order has not been placed with the supplier')
      }

      if (!order.skus?.length) {
        throw new Error('The inventory order has no items')
      }

      orderLocation = order.order_location
      const orderedBySkuId = new Map()

      for (const line of order.skus) {
        const skuId = line.skus_id?.id
        const sku = line.skus_id?.sku
        const orderedQuantity = line.quantity === null ? 0 : Number(line.quantity)

        if (!skuId || !sku) {
          throw new Error('An order item is missing its SKU')
        }

        if (!Number.isFinite(orderedQuantity) || orderedQuantity < 0) {
          throw new Error(`Invalid ordered quantity for ${sku}`)
        }

        const existing = orderedBySkuId.get(String(skuId))
        if (existing) {
          existing.orderedQuantity += orderedQuantity
        } else {
          orderedBySkuId.set(String(skuId), {
            skuId,
            sku,
            orderedQuantity
          })
        }
      }

      const skuResponse = await getItems({
        collection: 'skus',
        params: {
          filter: {
            id: { _in: [...orderedBySkuId.values()].map(item => item.skuId) }
          },
          fields: ['id', 'sku', 'quantity'],
          limit: -1
        }
      })

      const inventorySkus = Array.isArray(skuResponse) ? skuResponse : (skuResponse?.data || [])
      const inventoryById = new Map(inventorySkus.map(item => [String(item.id), item]))

      operations = [...orderedBySkuId.values()].map(item => {
        const inventoryItem = inventoryById.get(String(item.skuId))
        if (!inventoryItem) {
          throw new Error(`Inventory SKU not found: ${item.sku}`)
        }

        const previousInventoryQuantity = inventoryItem.quantity === null ? 0 : Number(inventoryItem.quantity)
        if (!Number.isFinite(previousInventoryQuantity)) {
          throw new Error(`Invalid inventory quantity for ${item.sku}`)
        }

        return {
          ...item,
          sku: inventoryItem.sku || item.sku,
          previousInventoryQuantity,
          finalInventoryQuantity: previousInventoryQuantity + item.orderedQuantity
        }
      })

      for (let index = 0; index < operations.length; index++) {
        const operation = operations[index]

        try {
          await updateItem({
            collection: 'skus',
            id: operation.skuId,
            item: {
              quantity: operation.finalInventoryQuantity
            }
          })
        } catch (updateError) {
          await handleDirectusAuthError(updateError)
          error.value = getDirectusErrorMessage(updateError, `Failed to update ${operation.sku}`)
          logFailureSummary(
            orderId,
            orderLocation,
            operation,
            applied,
            operations.slice(index + 1),
            updateError
          )
          return {
            success: false,
            error: updateError,
            applied,
            failed: operation,
            notAttempted: operations.slice(index + 1)
          }
        }

        const inventoryStore = useInventoryStore()
        const sriLankaInventoryStore = useSriLankaInventoryStore()
        inventoryStore.setSkuQuantity(operation.sku, operation.finalInventoryQuantity)
        sriLankaInventoryStore.setSkuQuantity(operation.sku, operation.finalInventoryQuantity)

        applied.push(operation)
        console.info(`[Inventory order ${orderId}] Applied ${operation.sku}`, {
          orderId,
          orderLocation,
          sku: operation.sku,
          orderedQuantity: operation.orderedQuantity,
          previousInventoryQuantity: operation.previousInventoryQuantity,
          finalInventoryQuantity: operation.finalInventoryQuantity
        })
      }

      try {
        await deleteItems({
          collection: 'inventory_orders',
          items: [String(orderId)]
        })
      } catch (deleteError) {
        await handleDirectusAuthError(deleteError)
        error.value = getDirectusErrorMessage(deleteError, 'Inventory was updated but the order could not be deleted')
        logFailureSummary(orderId, orderLocation, null, applied, [], deleteError)
        return {
          success: false,
          error: deleteError,
          applied,
          failed: null,
          notAttempted: []
        }
      }

      if (orderLocation === 'sri_lanka') {
        await useSriLankaOrdersStore().fetchOrders()
      } else {
        await useInventoryOrdersStore().fetchOrders()
      }

      console.info(`[Inventory order ${orderId}] Applied and deleted`, {
        orderId,
        orderLocation,
        applied
      })

      return {
        success: true,
        applied
      }
    } catch (applyError) {
      await handleDirectusAuthError(applyError)
      error.value = getDirectusErrorMessage(applyError, 'Failed to apply order to inventory')
      logFailureSummary(orderId, orderLocation, null, applied, operations, applyError)
      return {
        success: false,
        error: applyError,
        applied,
        failed: null,
        notAttempted: operations
      }
    } finally {
      applyingOrderId.value = null
    }
  }

  return {
    applyingOrderId,
    error,
    isApplyingOrder,
    applyOrderToInventory
  }
})
