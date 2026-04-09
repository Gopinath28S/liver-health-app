import React, { useState } from 'react';
import { UserPlus, Trash2 } from 'lucide-react';

function UserProfiles({ currentProfile, profiles, onSwitch, onAdd, onDelete }) {
  const [showForm, setShowForm] = useState(false);
  const [newName, setNewName] = useState('');
  const [newAge, setNewAge] = useState('');
  const [newGender, setNewGender] = useState('');

  const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];

  const handleAdd = () => {
    if (!newName.trim()) return;
    const profile = {
      id: Date.now().toString(),
      name: newName.trim(),
      age: newAge || '—',
      gender: newGender || '—',
      color: COLORS[profiles.length % COLORS.length],
      createdAt: new Date().toLocaleDateString()
    };
    onAdd(profile);
    setNewName('');
    setNewAge('');
    setNewGender('');
    setShowForm(false);
  };

  return (
    <div style={{
      background: '#fff',
      borderRadius: '12px',
      padding: '20px',
      marginBottom: '20px',
      boxShadow: '0 1px 4px rgba(0,0,0,0.08)'
    }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
        <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 600, color: '#1f2937' }}>
          Family Profiles
        </h3>
        <button
          onClick={() => setShowForm(!showForm)}
          style={{
            display: 'flex', alignItems: 'center', gap: '6px',
            background: '#3b82f6', color: '#fff', border: 'none',
            borderRadius: '8px', padding: '8px 14px', cursor: 'pointer', fontSize: '14px'
          }}
        >
          <UserPlus size={16} />
          Add Profile
        </button>
      </div>

      {/* Profile Cards */}
      <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', marginBottom: showForm ? '16px' : '0' }}>
        {profiles.map(profile => (
          <div
            key={profile.id}
            style={{
              display: 'flex', alignItems: 'center', gap: '10px',
              padding: '10px 14px', borderRadius: '10px', cursor: 'pointer',
              border: `2px solid ${currentProfile.id === profile.id ? profile.color : '#e5e7eb'}`,
              background: currentProfile.id === profile.id ? `${profile.color}18` : '#f9fafb',
              transition: 'all 0.2s'
            }}
            onClick={() => onSwitch(profile)}
          >
            {/* Avatar */}
            <div style={{
              width: '36px', height: '36px', borderRadius: '50%',
              background: profile.color, display: 'flex', alignItems: 'center',
              justifyContent: 'center', color: '#fff', fontWeight: 700,
              fontSize: '15px', flexShrink: 0
            }}>
              {profile.name.charAt(0).toUpperCase()}
            </div>

            {/* Info */}
            <div>
              <div style={{ fontWeight: 600, fontSize: '14px', color: '#1f2937' }}>{profile.name}</div>
              <div style={{ fontSize: '12px', color: '#6b7280' }}>
                {profile.age !== '—' ? `Age ${profile.age}` : 'Age —'}
                {profile.gender !== '—' ? ` · ${profile.gender}` : ''}
              </div>
            </div>

            {/* Delete (hidden for default profile) */}
            {profile.id !== 'default' && (
              <button
                onClick={(e) => { e.stopPropagation(); onDelete(profile.id); }}
                style={{
                  background: 'none', border: 'none', cursor: 'pointer',
                  color: '#ef4444', padding: '2px', marginLeft: '4px',
                  display: 'flex', alignItems: 'center'
                }}
                title="Delete profile"
              >
                <Trash2 size={14} />
              </button>
            )}
          </div>
        ))}
      </div>

      {/* Add Profile Form */}
      {showForm && (
        <div style={{
          background: '#f3f4f6', borderRadius: '10px', padding: '16px',
          display: 'flex', flexWrap: 'wrap', gap: '10px', alignItems: 'flex-end'
        }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            <label style={{ fontSize: '12px', color: '#6b7280', fontWeight: 500 }}>Name *</label>
            <input
              type="text"
              placeholder="e.g. Mom"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              style={{
                padding: '8px 12px', borderRadius: '8px', border: '1px solid #d1d5db',
                fontSize: '14px', outline: 'none', width: '140px'
              }}
            />
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            <label style={{ fontSize: '12px', color: '#6b7280', fontWeight: 500 }}>Age</label>
            <input
              type="number"
              placeholder="e.g. 45"
              value={newAge}
              onChange={(e) => setNewAge(e.target.value)}
              style={{
                padding: '8px 12px', borderRadius: '8px', border: '1px solid #d1d5db',
                fontSize: '14px', outline: 'none', width: '80px'
              }}
            />
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            <label style={{ fontSize: '12px', color: '#6b7280', fontWeight: 500 }}>Gender</label>
            <select
              value={newGender}
              onChange={(e) => setNewGender(e.target.value)}
              style={{
                padding: '8px 12px', borderRadius: '8px', border: '1px solid #d1d5db',
                fontSize: '14px', background: '#fff', width: '110px'
              }}
            >
              <option value="">Select</option>
              <option value="Male">Male</option>
              <option value="Female">Female</option>
              <option value="Other">Other</option>
            </select>
          </div>

          <div style={{ display: 'flex', gap: '8px' }}>
            <button
              onClick={handleAdd}
              style={{
                background: '#3b82f6', color: '#fff', border: 'none',
                borderRadius: '8px', padding: '8px 16px', cursor: 'pointer',
                fontSize: '14px', fontWeight: 600
              }}
            >
              Save
            </button>
            <button
              onClick={() => setShowForm(false)}
              style={{
                background: '#e5e7eb', color: '#374151', border: 'none',
                borderRadius: '8px', padding: '8px 16px', cursor: 'pointer', fontSize: '14px'
              }}
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default UserProfiles;