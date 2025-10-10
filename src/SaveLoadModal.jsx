import React, { useState, useEffect } from 'react';
import { listSaves, loadSave, saveSave, updateSlotName, deleteSave, NUM_SAVE_SLOTS } from './storage';

export default function SaveLoadModal({ isOpen, onClose, currentData, onLoad }) {
  const [saves, setSaves] = useState([]);
  const [loading, setLoading] = useState(false);
  const [editingSlot, setEditingSlot] = useState(null);
  const [editName, setEditName] = useState('');
  const [error, setError] = useState(null);

  // Load save slots when modal opens
  useEffect(() => {
    if (isOpen) {
      loadSaveSlots();
    }
  }, [isOpen]);

  const loadSaveSlots = async () => {
    setLoading(true);
    setError(null);
    try {
      const slots = await listSaves();
      setSaves(slots);
    } catch (err) {
      setError('Failed to load save slots');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (slot) => {
    if (!currentData) {
      setError('No data to save');
      return;
    }

    // Confirm if slot already has data
    const existingSave = saves.find((s, idx) => idx + 1 === slot);
    if (existingSave && existingSave.data) {
      const confirmed = window.confirm(`Overwrite "${existingSave.name}"?`);
      if (!confirmed) return;
    }

    setLoading(true);
    setError(null);
    try {
      await saveSave(slot, currentData);
      await loadSaveSlots();
    } catch (err) {
      setError(`Failed to save to slot ${slot}`);
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleLoad = async (slot) => {
    setLoading(true);
    setError(null);
    try {
      const saveData = await loadSave(slot);
      onLoad(saveData.data);
      onClose();
    } catch (err) {
      setError(`Failed to load from slot ${slot}`);
      console.error(err);
      setLoading(false);
    }
  };

  const handleDelete = async (slot) => {
    const save = saves.find((s, idx) => idx + 1 === slot);
    const confirmed = window.confirm(`Delete "${save.name}"? This cannot be undone.`);
    if (!confirmed) return;

    setLoading(true);
    setError(null);
    try {
      await deleteSave(slot);
      await loadSaveSlots();
    } catch (err) {
      setError(`Failed to delete slot ${slot}`);
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const startEditing = (slot, currentName) => {
    setEditingSlot(slot);
    setEditName(currentName);
  };

  const saveNameEdit = async () => {
    if (!editName.trim()) {
      setEditingSlot(null);
      return;
    }

    setLoading(true);
    setError(null);
    try {
      await updateSlotName(editingSlot, editName.trim());
      await loadSaveSlots();
      setEditingSlot(null);
    } catch (err) {
      setError(`Failed to update slot name`);
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const cancelEditing = () => {
    setEditingSlot(null);
    setEditName('');
  };

  const formatTimestamp = (timestamp) => {
    if (!timestamp) return 'Empty';
    const date = new Date(timestamp);
    return date.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit'
    });
  };

  if (!isOpen) return null;

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      background: 'rgba(0, 0, 0, 0.8)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 2000,
      padding: '20px'
    }}>
      <div style={{
        background: '#18181b',
        border: '1px solid #27272a',
        borderRadius: '12px',
        maxWidth: '800px',
        width: '100%',
        maxHeight: '90vh',
        overflow: 'auto',
        padding: '32px'
      }}>
        {/* Header */}
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '24px'
        }}>
          <h2 style={{ fontSize: '24px', fontWeight: 'bold', margin: 0 }}>
            Save / Load
          </h2>
          <button
            onClick={onClose}
            style={{
              background: 'transparent',
              border: 'none',
              color: '#a1a1aa',
              fontSize: '24px',
              cursor: 'pointer',
              padding: '4px 8px'
            }}
          >
            ×
          </button>
        </div>

        {/* Error Message */}
        {error && (
          <div style={{
            background: 'rgba(239, 68, 68, 0.1)',
            border: '1px solid #991b1b',
            borderRadius: '8px',
            padding: '12px',
            marginBottom: '16px',
            color: '#f87171'
          }}>
            {error}
          </div>
        )}

        {/* Loading State */}
        {loading && (
          <div style={{
            textAlign: 'center',
            padding: '20px',
            color: '#a1a1aa'
          }}>
            Loading...
          </div>
        )}

        {/* Save Slots */}
        <div style={{
          display: 'grid',
          gap: '16px'
        }}>
          {saves.map((save, idx) => {
            const slotNumber = idx + 1;
            const isEmpty = !save.data;
            const isEditing = editingSlot === slotNumber;

            return (
              <div
                key={slotNumber}
                style={{
                  background: '#27272a',
                  border: '1px solid #3f3f46',
                  borderRadius: '8px',
                  padding: '20px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '20px'
                }}
              >
                {/* Slot Number */}
                <div style={{
                  width: '48px',
                  height: '48px',
                  background: isEmpty ? '#3f3f46' : '#60a5fa',
                  color: isEmpty ? '#a1a1aa' : '#000000',
                  borderRadius: '8px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '24px',
                  fontWeight: 'bold',
                  flexShrink: 0
                }}>
                  {slotNumber}
                </div>

                {/* Slot Info */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  {isEditing ? (
                    <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                      <input
                        type="text"
                        value={editName}
                        onChange={(e) => setEditName(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') saveNameEdit();
                          if (e.key === 'Escape') cancelEditing();
                        }}
                        autoFocus
                        style={{
                          flex: 1,
                          background: '#18181b',
                          border: '1px solid #60a5fa',
                          borderRadius: '6px',
                          padding: '8px 12px',
                          color: '#fafafa',
                          fontSize: '16px',
                          fontWeight: '600'
                        }}
                      />
                      <button
                        onClick={saveNameEdit}
                        style={{
                          padding: '8px 16px',
                          background: '#22c55e',
                          color: '#000000',
                          border: 'none',
                          borderRadius: '6px',
                          cursor: 'pointer',
                          fontWeight: '600',
                          fontSize: '14px'
                        }}
                      >
                        ✓
                      </button>
                      <button
                        onClick={cancelEditing}
                        style={{
                          padding: '8px 16px',
                          background: '#3f3f46',
                          color: '#fafafa',
                          border: 'none',
                          borderRadius: '6px',
                          cursor: 'pointer',
                          fontSize: '14px'
                        }}
                      >
                        ✕
                      </button>
                    </div>
                  ) : (
                    <>
                      <div
                        onClick={() => !isEmpty && startEditing(slotNumber, save.name)}
                        style={{
                          fontSize: '16px',
                          fontWeight: '600',
                          marginBottom: '4px',
                          cursor: isEmpty ? 'default' : 'pointer',
                          color: isEmpty ? '#71717a' : '#fafafa'
                        }}
                        title={isEmpty ? '' : 'Click to rename'}
                      >
                        {save.name}
                      </div>
                      <div style={{
                        fontSize: '13px',
                        color: '#a1a1aa'
                      }}>
                        {formatTimestamp(save.timestamp)}
                      </div>
                    </>
                  )}
                </div>

                {/* Actions */}
                <div style={{ display: 'flex', gap: '8px', flexShrink: 0 }}>
                  <button
                    onClick={() => handleSave(slotNumber)}
                    disabled={loading}
                    style={{
                      padding: '10px 20px',
                      background: '#60a5fa',
                      color: '#000000',
                      border: 'none',
                      borderRadius: '6px',
                      cursor: loading ? 'not-allowed' : 'pointer',
                      fontWeight: '600',
                      fontSize: '14px',
                      opacity: loading ? 0.5 : 1
                    }}
                  >
                    Save
                  </button>
                  <button
                    onClick={() => handleLoad(slotNumber)}
                    disabled={isEmpty || loading}
                    style={{
                      padding: '10px 20px',
                      background: isEmpty ? '#3f3f46' : '#22c55e',
                      color: isEmpty ? '#71717a' : '#000000',
                      border: 'none',
                      borderRadius: '6px',
                      cursor: (isEmpty || loading) ? 'not-allowed' : 'pointer',
                      fontWeight: '600',
                      fontSize: '14px',
                      opacity: loading ? 0.5 : 1
                    }}
                  >
                    Load
                  </button>
                  {!isEmpty && (
                    <button
                      onClick={() => handleDelete(slotNumber)}
                      disabled={loading}
                      style={{
                        padding: '10px 16px',
                        background: 'transparent',
                        color: '#ef4444',
                        border: '1px solid #ef4444',
                        borderRadius: '6px',
                        cursor: loading ? 'not-allowed' : 'pointer',
                        fontWeight: '600',
                        fontSize: '14px',
                        opacity: loading ? 0.5 : 1
                      }}
                    >
                      🗑
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Footer Info */}
        <div style={{
          marginTop: '24px',
          padding: '16px',
          background: 'rgba(37, 99, 235, 0.1)',
          border: '1px solid #1e40af',
          borderRadius: '8px',
          fontSize: '13px',
          color: '#a1a1aa'
        }}>
          <div style={{ color: '#60a5fa', fontWeight: '600', marginBottom: '8px' }}>
            💡 Save Tips
          </div>
          <ul style={{ margin: 0, paddingLeft: '20px' }}>
            <li>Saves include inventory, components, and all settings</li>
            <li>Click slot name to rename (after saving)</li>
            <li>On localhost: Saved to browser storage</li>
            <li>On Vercel: Synced to cloud across devices</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
