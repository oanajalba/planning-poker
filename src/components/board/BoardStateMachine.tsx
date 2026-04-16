import React, { useState } from 'react';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { Input } from '@/components/ui/Input';

export function BoardStateMachine({ session, participants, boardTasks, identity }: any) {
  const isHost = identity.isHost;
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [editingTask, setEditingTask] = useState<any>(null);

  const handleAddTask = async () => {
    if (!newTaskTitle.trim()) return;
    try {
      await fetch('/api/v1/board_tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId: session.id, title: newTaskTitle, callerId: identity.participantId })
      });
      setNewTaskTitle('');
      setShowAddModal(false);
    } catch(err) { console.error(err); }
  };

  const handleEditTask = async () => {
    if (!editingTask || !editingTask.title.trim()) return;
    try {
      await fetch('/api/v1/board_tasks', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId: session.id, taskId: editingTask.id, title: editingTask.title, callerId: identity.participantId })
      });
      setEditingTask(null);
      setShowEditModal(false);
    } catch(err) { console.error(err); }
  };

  const handleDeleteTask = async (taskId: string) => {
    try {
      await fetch(`/api/v1/board_tasks?sessionId=${session.id}&taskId=${taskId}&callerId=${identity.participantId}`, {
        method: 'DELETE'
      });
    } catch(err) { console.error(err); }
  };

  const handleClearBoard = async () => {
    try {
      await fetch(`/api/v1/board_tasks?sessionId=${session.id}&callerId=${identity.participantId}`, {
        method: 'DELETE'
      });
      setShowClearConfirm(false);
    } catch(err) { console.error(err); }
  };

  const handleMoveTask = async (taskId: string, newStatus: string) => {
    try {
      await fetch('/api/v1/board_tasks', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId: session.id, taskId, status: newStatus, callerId: identity.participantId })
      });
    } catch(err) { console.error(err); }
  };

  const columns = [
    { id: 'todo', title: 'To Do' },
    { id: 'in_progress', title: 'In Progress' },
    { id: 'done', title: 'Done' }
  ];

  const handleDragStart = (e: React.DragEvent, taskId: string) => {
    e.dataTransfer.setData('taskId', taskId);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = (e: React.DragEvent, status: string) => {
    e.preventDefault();
    const taskId = e.dataTransfer.getData('taskId');
    if (taskId) {
      handleMoveTask(taskId, status);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', flex: 1 }}>
      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem' }}>
        {isHost && (
          <Button variant="ghost" onClick={() => setShowClearConfirm(true)} style={{ color: 'var(--error-color, #ff4444)' }}>
            Clear Board
          </Button>
        )}
        {isHost && (
          <Button onClick={() => setShowAddModal(true)}>+ Add Task</Button>
        )}
      </div>

      <div style={{ 
        display: 'flex', gap: '1rem', overflowX: 'auto', flex: 1, 
        paddingBottom: '1rem', 
        scrollSnapType: 'x mandatory' 
      }}>
        {columns.map(col => (
          <div 
            key={col.id} 
            onDragOver={handleDragOver}
            onDrop={(e) => handleDrop(e, col.id)}
            style={{
              flex: '1 0 300px',
              backgroundColor: 'var(--secondary-color)',
              borderRadius: '12px',
              padding: '1rem',
              display: 'flex',
              flexDirection: 'column',
              gap: '1rem',
              scrollSnapAlign: 'start'
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ fontSize: '1.1rem', margin: 0 }}>{col.title}</h3>
              <span style={{ fontSize: '0.8rem', backgroundColor: 'var(--border-color)', padding: '0.2rem 0.5rem', borderRadius: '12px' }}>
                {boardTasks.filter((t:any) => t.status === col.id).length}
              </span>
            </div>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', flex: 1 }}>
              {boardTasks.filter((t:any) => t.status === col.id).map((task:any) => (
                <div 
                  key={task.id} 
                  draggable={isHost}
                  onDragStart={(e) => handleDragStart(e, task.id)}
                  style={{ 
                    backgroundColor: 'var(--bg-color)', 
                    padding: '1rem', 
                    borderRadius: '8px',
                    border: '1px solid var(--border-color)',
                    boxShadow: '0 2px 4px rgba(0,0,0,0.05)',
                    cursor: isHost ? 'grab' : 'default',
                    position: 'relative'
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '0.5rem' }}>
                    <div style={{ fontWeight: '500', flex: 1 }}>{task.title}</div>
                    {isHost && (
                      <div style={{ display: 'flex', gap: '0.2rem' }}>
                        <button 
                          onClick={() => { setEditingTask(task); setShowEditModal(true); }}
                          style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '0.9rem', opacity: 0.5 }}
                          title="Edit"
                        >
                          ✎
                        </button>
                        <button 
                          onClick={() => handleDeleteTask(task.id)}
                          style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '0.9rem', opacity: 0.5 }}
                          title="Delete"
                        >
                          ✕
                        </button>
                      </div>
                    )}
                  </div>
                  
                  {isHost && (
                    <div style={{ display: 'flex', gap: '0.5rem', marginTop: '1rem', overflowX: 'auto' }}>
                      {columns.filter(c => c.id !== task.status).map(c => (
                        <Button 
                          key={c.id} 
                          variant="ghost" 
                          style={{ padding: '0.2rem 0.5rem', fontSize: '0.7rem' }}
                          onClick={() => handleMoveTask(task.id, c.id)}
                        >
                          → {c.title}
                        </Button>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Add Task Modal */}
      <Modal isOpen={showAddModal} onClose={() => setShowAddModal(false)} title="Add Task">
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <Input 
            label="Task Title" 
            value={newTaskTitle} 
            onChange={e => setNewTaskTitle(e.target.value)} 
            placeholder="e.g. Implement header" 
            fullWidth 
            autoFocus
          />
          <Button onClick={handleAddTask} disabled={!newTaskTitle.trim()} fullWidth>Create Task</Button>
        </div>
      </Modal>

      {/* Edit Task Modal */}
      <Modal isOpen={showEditModal} onClose={() => { setShowEditModal(false); setEditingTask(null); }} title="Edit Task">
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <Input 
            label="Task Title" 
            value={editingTask?.title || ''} 
            onChange={e => setEditingTask({ ...editingTask, title: e.target.value })} 
            fullWidth 
            autoFocus
          />
          <Button onClick={handleEditTask} disabled={!editingTask?.title?.trim()} fullWidth>Save Changes</Button>
        </div>
      </Modal>

      {/* Clear Board Confirmation */}
      <Modal isOpen={showClearConfirm} onClose={() => setShowClearConfirm(false)} title="Clear Board?">
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          <p>Are you sure you want to delete all tasks? This cannot be undone.</p>
          <div style={{ display: 'flex', gap: '0.75rem' }}>
            <Button variant="ghost" onClick={() => setShowClearConfirm(false)} fullWidth>Cancel</Button>
            <Button onClick={handleClearBoard} style={{ backgroundColor: '#ff4444' }} fullWidth>Clear All Tasks</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
