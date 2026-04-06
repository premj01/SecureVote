import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, BarChart3, Users, Clock, Calendar } from 'lucide-react';
import API from '../../services/api';
import { format } from 'date-fns';

export default function AdminDashboard() {
  const navigate = useNavigate();
  const [elections, setElections] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadElections();
  }, []);

  const loadElections = async () => {
    try {
      const res = await API.get('/admin/elections');
      setElections(res.data.elections);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (date) => {
    try {
      const standardDate = typeof date === 'string' ? date.replace(' ', 'T') : date;
      return format(new Date(standardDate), 'dd MMM, hh:mm a');
    } catch {
      return date;
    }
  };

  const getStatusBadge = (status) => {
    const styles = {
      'application_open': 'bg-green-50 text-green-700',
      'application_closed': 'bg-yellow-50 text-yellow-700',
      'voting_active': 'bg-blue-50 text-blue-700',
      'upcoming': 'bg-slate-100 text-slate-600',
      'paused': 'bg-orange-50 text-orange-700',
      'ended': 'bg-slate-100 text-slate-500',
    };
    const labels = {
      'application_open': 'Applications Open',
      'application_closed': 'Apps Closed',
      'voting_active': 'Voting Active',
      'upcoming': 'Upcoming',
      'paused': 'Paused',
      'ended': 'Ended',
    };
    return (
      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${styles[status] || ''}`}>
        {labels[status] || status}
      </span>
    );
  };

  const activeElections = elections.filter(e => !['ended'].includes(e.status));
  const completedElections = elections.filter(e => e.status === 'ended');

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-slate-400">Loading...</div>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto px-4 py-6 fade-in">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold text-slate-800">Admin Dashboard</h1>
          <p className="text-sm text-slate-500">Manage elections and candidates</p>
        </div>
        <button
          onClick={() => navigate('/admin/create-election')}
          className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors"
        >
          <Plus size={16} />
          Create Election
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <div className="bg-white rounded-xl border border-slate-200 p-4">
          <p className="text-xs text-slate-500 mb-1">Total Elections</p>
          <p className="text-2xl font-bold text-slate-800">{elections.length}</p>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-4">
          <p className="text-xs text-slate-500 mb-1">Active</p>
          <p className="text-2xl font-bold text-blue-600">{elections.filter(e => e.status === 'voting_active').length}</p>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-4">
          <p className="text-xs text-slate-500 mb-1">Pending Apps</p>
          <p className="text-2xl font-bold text-yellow-600">{elections.reduce((sum, e) => sum + (e.pending_applications || 0), 0)}</p>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-4">
          <p className="text-xs text-slate-500 mb-1">Completed</p>
          <p className="text-2xl font-bold text-slate-500">{completedElections.length}</p>
        </div>
      </div>

      {/* Active Elections */}
      <div className="mb-6">
        <h2 className="font-semibold text-slate-800 mb-3">Active & Upcoming Elections</h2>
        {activeElections.length === 0 ? (
          <div className="bg-white rounded-xl border border-slate-200 p-8 text-center text-sm text-slate-400">
            No active elections. Create one to get started.
          </div>
        ) : (
          <div className="grid md:grid-cols-2 gap-4">
            {activeElections.map((election) => (
              <div key={election.election_id} className="bg-white rounded-xl border border-slate-200 p-5">
                <div className="flex items-start justify-between mb-3">
                  <h3 className="font-medium text-slate-800">{election.title}</h3>
                  {getStatusBadge(election.status)}
                </div>
                <div className="text-xs text-slate-500 space-y-1.5 mb-4">
                  <div className="flex items-center gap-2">
                    <Calendar size={12} />
                    <span>Application: {formatDate(election.application_start)} → {formatDate(election.application_end)}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Clock size={12} />
                    <span>Voting: {formatDate(election.voting_start)} → {formatDate(election.voting_end)}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Users size={12} />
                    <span>Candidates: {election.approved_candidates || 0} approved, {election.pending_applications || 0} pending</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <BarChart3 size={12} />
                    <span>Votes: {election.total_votes || 0}</span>
                  </div>
                  <div className="text-slate-400">
                    Session Code: <span className="font-mono font-medium text-slate-600">{election.session_code}</span>
                  </div>
                </div>
                <button
                  onClick={() => navigate(`/admin/election/${election.election_id}`)}
                  className="w-full bg-slate-50 text-slate-700 py-2 rounded-lg text-sm font-medium hover:bg-slate-100 transition-colors border border-slate-200"
                >
                  Manage Election
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Completed Elections */}
      {completedElections.length > 0 && (
        <div>
          <h2 className="font-semibold text-slate-800 mb-3">Completed Elections</h2>
          <div className="grid md:grid-cols-2 gap-4">
            {completedElections.map((election) => (
              <div key={election.election_id} className="bg-white rounded-xl border border-slate-200 p-5">
                <div className="flex items-start justify-between mb-2">
                  <h3 className="font-medium text-slate-800">{election.title}</h3>
                  {getStatusBadge(election.status)}
                </div>
                <p className="text-xs text-slate-500 mb-3">Total votes: {election.total_votes || 0}</p>
                <button
                  onClick={() => navigate(`/admin/election/${election.election_id}`)}
                  className="text-sm text-blue-600 hover:underline font-medium"
                >
                  View Results →
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
