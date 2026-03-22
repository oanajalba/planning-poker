import React, { useState } from 'react';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { Input } from '@/components/ui/Input';

export function BoardStateMachine({ session, participants, boardTasks, identity }: any) {
  const isHost = identity.isHost;
  const [showAddModal, setShowAddModal] = useState(false);
  const [newTaskTitle, setNewTaskTitle] = useState('');

  const handleAddTask = async () => {
    if (!newTaskTitle.trim()) return;
    try {
      await fetch('/api/v1/board_tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId: session.id, title: newTaskTitle })
      });
      setNewTaskTitle('');
      setShowAddModal(false);
    } catch(err) { console.error(err); }
  };

  const handleMoveTask = async (taskId: string, newStatus: string) => {
    try {
      await fetch('/api/v1/board_tasks', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ taskId, status: newStatus })
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
      <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
        <Button onClick={() => setShowAddModal(true)}>+ Add Task</Button>
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
                    cursor: isHost ? 'grab' : 'default'
                  }}
                >
                  <div style={{ fontWeight: '500' }}>{task.title}</div>
                  
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
    </div>
  );
}
