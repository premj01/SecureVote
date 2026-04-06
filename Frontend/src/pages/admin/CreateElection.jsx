import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Calendar } from 'lucide-react';
import API from '../../services/api';

export default function CreateElection() {
  const navigate = useNavigate();
  const [form, setForm] = useState({
    title: '',
    application_start: '',
    application_end: '',
    voting_start: '',
    voting_end: ''
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [createdElection, setCreatedElection] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const res = await API.post('/admin/create-election', form);
      setCreatedElection(res.data.election);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to create election.');
    } finally {
      setLoading(false);
    }
  };

  if (createdElection) {
    return (
      <div className="max-w-md mx-auto px-4 py-12 text-center fade-in">
        <div className="bg-white rounded-xl border border-slate-200 p-8">
          <div className="w-14 h-14 bg-green-50 rounded-full flex items-center justify-center mx-auto mb-4">
            <Calendar size={28} className="text-green-600" />
          </div>
          <h2 className="text-xl font-bold text-slate-800 mb-2">Election Created!</h2>
          <p className="text-sm text-slate-500 mb-4">{createdElection.title}</p>

          <div className="bg-blue-50 border border-blue-100 rounded-lg p-4 mb-6">
            <p className="text-xs text-blue-600 mb-1">Election ID (Session Code)</p>
            <p className="text-3xl font-mono font-bold text-blue-700 tracking-widest">{createdElection.session_code}</p>
            <p className="text-xs text-blue-500 mt-1">Share this code with voters</p>
          </div>

          <div className="flex gap-3">
            <button
              onClick={() => navigate('/admin')}
              className="flex-1 bg-white text-slate-700 py-2.5 rounded-lg text-sm border border-slate-200 hover:bg-slate-50"
            >
              Dashboard
            </button>
            <button
              onClick={() => navigate(`/admin/election/${createdElection.election_id}`)}
              className="flex-1 bg-blue-600 text-white py-2.5 rounded-lg text-sm hover:bg-blue-700"
            >
              Manage
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-lg mx-auto px-4 py-6 fade-in">
      <button
        onClick={() => navigate('/admin')}
        className="flex items-center gap-1 text-sm text-slate-500 hover:text-slate-700 mb-4"
      >
        <ArrowLeft size={16} />
        Back to Dashboard
      </button>

      <div className="bg-white rounded-xl border border-slate-200 p-6">
        <h1 className="text-lg font-bold text-slate-800 mb-1">Create New Election</h1>
        <p className="text-sm text-slate-500 mb-5">Set up election title and time windows</p>

        {error && (
          <div className="bg-red-50 text-red-600 text-sm px-4 py-2.5 rounded-lg mb-4 border border-red-100">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Election Title</label>
            <input
              type="text"
              required
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              className="w-full px-4 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="e.g., Div A Monitor Election"
            />
          </div>

          <div className="border-t border-slate-100 pt-4">
            <p className="text-sm font-medium text-slate-700 mb-3"> Candidate Application Period</p>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs text-slate-500 mb-1">Start Date & Time</label>
                <input
                  type="datetime-local"
                  required
                  value={form.application_start}
                  onChange={(e) => setForm({ ...form, application_start: e.target.value })}
                  className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-xs text-slate-500 mb-1">End Date & Time</label>
                <input
                  type="datetime-local"
                  required
                  value={form.application_end}
                  onChange={(e) => setForm({ ...form, application_end: e.target.value })}
                  className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </div>
          </div>

          <div className="border-t border-slate-100 pt-4">
            <p className="text-sm font-medium text-slate-700 mb-3">  Voting Period</p>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs text-slate-500 mb-1">Start Date & Time</label>
                <input
                  type="datetime-local"
                  required
                  value={form.voting_start}
                  onChange={(e) => setForm({ ...form, voting_start: e.target.value })}
                  className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-xs text-slate-500 mb-1">End Date & Time</label>
                <input
                  type="datetime-local"
                  required
                  value={form.voting_end}
                  onChange={(e) => setForm({ ...form, voting_end: e.target.value })}
                  className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-600 text-white py-2.5 rounded-lg font-medium hover:bg-blue-700 transition-colors disabled:opacity-50 text-sm mt-2"
          >
            {loading ? 'Creating...' : 'Create Election'}
          </button>
        </form>
      </div>
    </div>
  );
}
