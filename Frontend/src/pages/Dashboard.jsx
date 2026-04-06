import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Calendar, Clock, CheckCircle, FileText, Vote } from 'lucide-react';
import API from '../services/api';
import { format } from 'date-fns';

export default function Dashboard() {
  const navigate = useNavigate();
  const user = JSON.parse(localStorage.getItem('user') || '{}');
  const [sessionCode, setSessionCode] = useState('');
  const [elections, setElections] = useState([]);
  const [history, setHistory] = useState([]);
  const [myApps, setMyApps] = useState([]);
  const [error, setError] = useState('');
  const [searchLoading, setSearchLoading] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [electionsRes, historyRes, appsRes] = await Promise.all([
        API.get('/elections/upcoming'),
        API.get('/elections/history'),
        API.get('/elections/my-applications')
      ]);
      setElections(electionsRes.data.elections);
      setHistory(historyRes.data.history);
      setMyApps(appsRes.data.applications);
    } catch (err) {
      console.error('Load data error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleFindElection = async (e) => {
    e.preventDefault();
    setError('');
    setSearchLoading(true);

    try {
      const res = await API.post('/elections/find-by-code', { session_code: sessionCode });
      navigate(`/vote/${res.data.election.election_id}`, {
        state: { election: res.data.election, candidates: res.data.candidates }
      });
    } catch (err) {
      if (err.response?.data?.already_voted) {
        navigate(`/results/${err.response.data.election.election_id}`);
        return;
      }
      setError(err.response?.data?.error || 'Election not found.');
    } finally {
      setSearchLoading(false);
    }
  };

  const formatDate = (date) => {
    try {
      const standardDate = typeof date === 'string' ? date.replace(' ', 'T') : date;
      return format(new Date(standardDate), 'dd MMM yyyy, hh:mm a');
    } catch {
      return date;
    }
  };

  const getStatusBadge = (status) => {
    const styles = {
      'application_open': 'bg-green-50 text-green-700 border-green-200',
      'application_closed': 'bg-yellow-50 text-yellow-700 border-yellow-200',
      'voting_active': 'bg-blue-50 text-blue-700 border-blue-200',
      'upcoming': 'bg-slate-50 text-slate-600 border-slate-200',
      'paused': 'bg-orange-50 text-orange-700 border-orange-200',
      'ended': 'bg-slate-100 text-slate-500 border-slate-200',
    };
    const labels = {
      'application_open': 'Applications Open',
      'application_closed': 'Applications Closed',
      'voting_active': 'Voting Active',
      'upcoming': 'Upcoming',
      'paused': 'Paused',
      'ended': 'Ended',
    };
    return (
      <span className={`text-xs px-2 py-0.5 rounded-full border font-medium ${styles[status] || styles.upcoming}`}>
        {labels[status] || status}
      </span>
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-slate-400">Loading...</div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-6 fade-in">
      {/* Welcome */}
      <div className="mb-6">
        <h1 className="text-xl font-bold text-slate-800">Welcome, {user.full_name}</h1>
        <p className="text-sm text-slate-500 mt-1">Voter ID: <span className="font-mono bg-slate-100 px-2 py-0.5 rounded text-slate-600">{user.voter_id}</span></p>
      </div>

      {/* Enter Election ID */}
      <div className="bg-white rounded-xl border border-slate-200 p-5 mb-6">
        <h2 className="font-semibold text-slate-800 mb-3 flex items-center gap-2">
          <Search size={18} className="text-blue-600" />
          Enter Election ID
        </h2>
        <form onSubmit={handleFindElection} className="flex gap-2">
          <input
            type="text"
            value={sessionCode}
            onChange={(e) => setSessionCode(e.target.value)}
            placeholder="Enter 6-digit Election ID"
            maxLength={6}
            className="flex-1 px-4 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
          <button
            type="submit"
            disabled={searchLoading || sessionCode.length < 6}
            className="bg-blue-600 text-white px-5 py-2.5 rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors disabled:opacity-50"
          >
            {searchLoading ? '...' : 'Find'}
          </button>
        </form>
        {error && <p className="text-red-500 text-sm mt-2">{error}</p>}
      </div>

      {/* Active & Upcoming Elections */}
      <div className="mb-6">
        <h2 className="font-semibold text-slate-800 mb-3 flex items-center gap-2">
          <Calendar size={18} className="text-blue-600" />
          Elections
        </h2>
        {elections.length === 0 ? (
          <div className="bg-white rounded-xl border border-slate-200 p-6 text-center text-sm text-slate-400">
            No elections available right now
          </div>
        ) : (
          <div className="space-y-3">
            {elections.map((election) => (
              <div key={election.election_id} className="bg-white rounded-xl border border-slate-200 p-4">
                <div className="flex items-start justify-between mb-2">
                  <h3 className="font-medium text-slate-800">{election.title}</h3>
                  {getStatusBadge(election.status)}
                </div>
                <div className="text-xs text-slate-500 space-y-1">
                  {election.status === 'application_open' && (
                    <p className="flex items-center gap-1">
                      <Clock size={12} />
                      Applications close: {formatDate(election.application_end)}
                    </p>
                  )}
                  {election.status === 'voting_active' && (
                    <p className="flex items-center gap-1">
                      <Clock size={12} />
                      Voting ends: {formatDate(election.voting_end)}
                    </p>
                  )}
                  {(election.status === 'upcoming' || election.status === 'application_closed') && (
                    <p className="flex items-center gap-1">
                      <Clock size={12} />
                      Voting starts: {formatDate(election.voting_start)}
                    </p>
                  )}
                  <p className="text-slate-400">
                    Election ID: <span className="font-mono">{election.session_code}</span>
                  </p>
                </div>
                <div className="mt-3 flex gap-2">
                  {election.status === 'application_open' && (
                    <button
                      onClick={() => navigate(`/apply/${election.election_id}`)}
                      className="text-xs bg-blue-50 text-blue-600 px-3 py-1.5 rounded-lg hover:bg-blue-100 transition-colors font-medium"
                    >
                      Apply as Candidate
                    </button>
                  )}
                  {election.status === 'voting_active' && (
                    <button
                      onClick={() => {
                        setSessionCode(election.session_code);
                        handleFindElection({ preventDefault: () => { } });
                      }}
                      className="text-xs bg-blue-600 text-white px-3 py-1.5 rounded-lg hover:bg-blue-700 transition-colors font-medium"
                    >
                      Vote Now
                    </button>
                  )}
                  {election.status === 'ended' && (
                    <button
                      onClick={() => navigate(`/results/${election.election_id}`)}
                      className="text-xs bg-slate-100 text-slate-600 px-3 py-1.5 rounded-lg hover:bg-slate-200 transition-colors font-medium"
                    >
                      View Results
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* My Candidate Applications */}
      {myApps.length > 0 && (
        <div className="mb-6">
          <h2 className="font-semibold text-slate-800 mb-3 flex items-center gap-2">
            <FileText size={18} className="text-blue-600" />
            My Candidate Applications
          </h2>
          <div className="space-y-3">
            {myApps.map((app) => (
              <div key={app.application_id} className="bg-white rounded-xl border border-slate-200 p-4">
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="font-medium text-slate-800 text-sm">{app.title}</h3>
                    <p className="text-xs text-slate-400 mt-1">Applied: {formatDate(app.applied_at)}</p>
                  </div>
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${app.status === 'approved' ? 'bg-green-50 text-green-700' :
                    app.status === 'rejected' ? 'bg-red-50 text-red-700' :
                      'bg-yellow-50 text-yellow-700'
                    }`}>
                    {app.status.charAt(0).toUpperCase() + app.status.slice(1)}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Voting History */}
      {history.length > 0 && (
        <div className="mb-6">
          <h2 className="font-semibold text-slate-800 mb-3 flex items-center gap-2">
            <CheckCircle size={18} className="text-blue-600" />
            Voting History
          </h2>
          <div className="space-y-3">
            {history.map((item, i) => (
              <div key={i} className="bg-white rounded-xl border border-slate-200 p-4 flex items-center justify-between">
                <div>
                  <h3 className="font-medium text-slate-800 text-sm">{item.title}</h3>
                  <p className="text-xs text-slate-400 mt-1">Voted: {formatDate(item.voted_at)}</p>
                </div>
                {item.status === 'ended' && (
                  <button
                    onClick={() => navigate(`/results/${item.election_id}`)}
                    className="text-xs text-blue-600 hover:underline font-medium"
                  >
                    Results
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
