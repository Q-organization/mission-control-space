import { useState } from 'react';

interface ReassignTaskModalProps {
  isOpen: boolean;
  onClose: () => void;
  onReassign: (newOwner: string) => void;
  currentOwner: string | null;
  taskName: string;
}

const TEAM_MEMBERS = [
  { id: '', name: 'Unassigned' },
  { id: 'quentin', name: 'Quentin' },
  { id: 'armel', name: 'Armel' },
  { id: 'alex', name: 'Alex' },
  { id: 'milya', name: 'Milya' },
  { id: 'hugues', name: 'Hugues' },
];

export function ReassignTaskModal({ isOpen, onClose, onReassign, currentOwner, taskName }: ReassignTaskModalProps) {
  const [selectedOwner, setSelectedOwner] = useState('');

  if (!isOpen) return null;

  const handleReassign = () => {
    if (!selectedOwner) return;
    onReassign(selectedOwner);
    setSelectedOwner('');
    onClose();
  };

  // Filter out current owner from options
  const availableMembers = TEAM_MEMBERS.filter(m => m.id !== currentOwner?.toLowerCase());

  return (
    <div style={styles.modalOverlay} onClick={onClose}>
      <div style={styles.modal} onClick={e => e.stopPropagation()}>
        <h2 style={styles.modalTitle}>Send Task</h2>

        <p style={styles.taskName}>{taskName}</p>

        {currentOwner && (
          <p style={styles.currentOwner}>
            Currently: {currentOwner.charAt(0).toUpperCase() + currentOwner.slice(1)}
          </p>
        )}

        <div style={styles.memberGrid}>
          {availableMembers.map(member => (
            <button
              key={member.id}
              style={{
                ...styles.memberButton,
                ...(selectedOwner === member.id ? styles.memberButtonSelected : {}),
              }}
              onClick={() => setSelectedOwner(member.id)}
            >
              {member.name}
            </button>
          ))}
        </div>

        <div style={styles.modalButtons}>
          <button style={styles.cancelButton} onClick={onClose}>
            Cancel
          </button>
          <button
            style={{
              ...styles.sendButton,
              opacity: !selectedOwner ? 0.5 : 1,
              cursor: !selectedOwner ? 'not-allowed' : 'pointer',
            }}
            onClick={handleReassign}
            disabled={!selectedOwner}
          >
            Send
          </button>
        </div>

        <p style={styles.shortcutHint}>Press Esc to close</p>
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  modalOverlay: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    background: 'rgba(0,0,0,0.85)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1000,
  },
  modal: {
    background: '#1a1a2e',
    borderRadius: 16,
    padding: '2rem',
    width: '90%',
    maxWidth: 360,
    border: '1px solid #f59e0b',
    boxShadow: '0 0 30px rgba(245, 158, 11, 0.2)',
  },
  modalTitle: {
    fontFamily: 'Orbitron, sans-serif',
    fontSize: '1.3rem',
    color: '#f59e0b',
    marginTop: 0,
    marginBottom: '0.5rem',
    textAlign: 'center',
  },
  taskName: {
    color: '#fff',
    fontSize: '1rem',
    textAlign: 'center',
    margin: '0 0 0.5rem 0',
    maxWidth: '100%',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },
  currentOwner: {
    color: '#888',
    fontSize: '0.85rem',
    textAlign: 'center',
    margin: '0 0 1.5rem 0',
  },
  memberGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(2, 1fr)',
    gap: '0.75rem',
    marginBottom: '1.5rem',
  },
  memberButton: {
    padding: '0.75rem 1rem',
    background: 'rgba(255,255,255,0.05)',
    border: '1px solid #333',
    borderRadius: 8,
    color: '#fff',
    fontSize: '0.95rem',
    cursor: 'pointer',
    transition: 'all 0.2s',
  },
  memberButtonSelected: {
    background: 'rgba(245, 158, 11, 0.2)',
    borderColor: '#f59e0b',
    color: '#f59e0b',
  },
  modalButtons: {
    display: 'flex',
    gap: '1rem',
    justifyContent: 'flex-end',
  },
  cancelButton: {
    padding: '0.75rem 1.5rem',
    background: 'transparent',
    border: '1px solid #444',
    borderRadius: 8,
    color: '#888',
    cursor: 'pointer',
    fontSize: '1rem',
  },
  sendButton: {
    padding: '0.75rem 1.5rem',
    background: 'linear-gradient(90deg, #f59e0b, #d97706)',
    border: 'none',
    borderRadius: 8,
    color: '#fff',
    cursor: 'pointer',
    fontSize: '1rem',
    fontWeight: 600,
  },
  shortcutHint: {
    textAlign: 'center',
    color: '#555',
    fontSize: '0.75rem',
    marginTop: '1rem',
    marginBottom: 0,
  },
};
