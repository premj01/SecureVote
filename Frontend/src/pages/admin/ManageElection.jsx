import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Check, X, Play, Pause, StopCircle, Users, BarChart3, Clock, Info } from 'lucide-react';
import API from '../../services/api';
import { format } from 'date-fns';

export default function ManageElection() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [election, setElection] = useState(null);
  const [applications, setApplications] = useState([]);
  const [results, setResults] = useState(null);
  const [activeTab, setActiveTab] = useState('overview');
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState('');

  useEffect(() => {
    loadData();
  }, [id]);

  const loadData = async () => {
    try {
      const [electionRes, appsRes, resultsRes] = await Promise.all([
        API.get(`/admin/election/${id}`),
        API.get(`/admin/election/${id}/applications`),
        API.get(`/admin/results/${id}`)
      ]);
      setElection(electionRes.data.election);
      setApplications(appsRes.data.applications);
      setResults(resultsRes.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (appId) => {
    setActionLoading(`approve-${appId}`);
    try {
      await API.patch(`/admin/application/${appId}/approve`);
      loadData();
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to approve');
    } finally {
      setActionLoading('');
    }
  };

  const handleReject = async (appId) => {
    setActionLoading(`reject-${appId}`);
    try {
      await API.patch(`/admin/application/${appId}/reject`);
      loadData();
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to reject');
    } finally {
      setActionLoading('');
    }
  };

  const handlePause = async () => {
    setActionLoading('pause');
    try {
      await API.patch(`/admin/election/${id}/pause`);
      loadData();
    } catch (err) {
      alert(err.response?.data?.error || 'Failed');
    } finally {
      setActionLoading('');
    }
  };

  const handleResume = async () => {
    setActionLoading('resume');
    try {
      await API.patch(`/admin/election/${id}/resume`);
      loadData();
    } catch (err) {
      alert(err.response?.data?.error || 'Failed');
    } finally {
      setActionLoading('');
    }
  };

  const handleEnd = async () => {
    if (!confirm('Are you sure you want to end this election? This cannot be undone.')) return;
    setActionLoading('end');
    try {
      await API.patch(`/admin/election/${id}/end`);
      loadData();
    } catch (err) {
      alert(err.response?.data?.error || 'Failed');
    } finally {
      setActionLoading('');
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

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-slate-400">Loading...</div>
      </div>
    );
  }

  if (!election) {
    return (
      <div className="max-w-md mx-auto px-4 py-12 text-center">
        <p className="text-slate-500">Election not found.</p>
      </div>
    );
  }

  const pendingApps = applications.filter(a => a.status === 'pending');
  const approvedApps = applications.filter(a => a.status === 'approved');
  const rejectedApps = applications.filter(a => a.status === 'rejected');

  const tabs = [
    { id: 'overview', label: 'Overview', icon: Info },
    { id: 'pending', label: `Pending (${pendingApps.length})`, icon: Clock },
    { id: 'approved', label: `Approved (${approvedApps.length})`, icon: Check },
    { id: 'control', label: 'Control', icon: Play },
    { id: 'results', label: 'Results', icon: BarChart3 },
  ];

  return (
    <div className="max-w-4xl mx-auto px-4 py-6 fade-in">
      <button
        onClick={() => navigate('/admin')}
        className="flex items-center gap-1 text-sm text-slate-500 hover:text-slate-700 mb-4"
      >
        <ArrowLeft size={16} />
        Back to Dashboard
      </button>

      <div className="mb-5">
        <h1 className="text-xl font-bold text-slate-800">{election.title}</h1>
        <p className="text-sm text-slate-500 mt-1">
          Session Code: <span className="font-mono font-medium text-blue-600">{election.session_code}</span>
        </p>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-slate-100 p-1 rounded-lg mb-6 overflow-x-auto">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-md text-sm font-medium whitespace-nowrap transition-colors ${
              activeTab === tab.id
                ? 'bg-white text-blue-600 shadow-sm'
                : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            <tab.icon size={14} />
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      {activeTab === 'overview' && (
        <div className="bg-white rounded-xl border border-slate-200 p-6 space-y-4">
          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <p className="text-xs text-slate-500 mb-1">Application Period</p>
              <p className="text-sm text-slate-700">{formatDate(election.application_start)}</p>
              <p className="text-sm text-slate-700">→ {formatDate(election.application_end)}</p>
            </div>
            <div>
              <p className="text-xs text-slate-500 mb-1">Voting Period</p>
              <p className="text-sm text-slate-700">{formatDate(election.voting_start)}</p>
              <p className="text-sm text-slate-700">→ {formatDate(election.voting_end)}</p>
            </div>
          </div>
          <div className="grid grid-cols-3 gap-4 pt-4 border-t border-slate-100">
            <div className="text-center">
              <p className="text-2xl font-bold text-slate-800">{election.total_applications || 0}</p>
              <p className="text-xs text-slate-500">Applications</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-blue-600">{election.approved_candidates || 0}</p>
              <p className="text-xs text-slate-500">Candidates</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-green-600">{election.total_votes || 0}</p>
              <p className="text-xs text-slate-500">Votes Cast</p>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'pending' && (
        <div>
          {pendingApps.length === 0 ? (
            <div className="bg-white rounded-xl border border-slate-200 p-8 text-center text-sm text-slate-400">
              No pending applications
            </div>
          ) : (
            <div className="space-y-3">
              {pendingApps.map((app) => (
                <div key={app.application_id} className="bg-white rounded-xl border border-slate-200 p-4 flex items-center justify-between">
                  <div>
                    <p className="font-medium text-slate-800 text-sm">{app.full_name}</p>
                    <p className="text-xs text-slate-500">Voter ID: {app.voter_id} • {app.email}</p>
                    <p className="text-xs text-slate-400">Applied: {formatDate(app.applied_at)}</p>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleApprove(app.application_id)}
                      disabled={actionLoading === `approve-${app.application_id}`}
                      className="flex items-center gap-1 bg-green-50 text-green-700 px-3 py-1.5 rounded-lg text-xs font-medium hover:bg-green-100 disabled:opacity-50"
                    >
                      <Check size={14} />
                      Approve
                    </button>
                    <button
                      onClick={() => handleReject(app.application_id)}
                      disabled={actionLoading === `reject-${app.application_id}`}
                      className="flex items-center gap-1 bg-red-50 text-red-700 px-3 py-1.5 rounded-lg text-xs font-medium hover:bg-red-100 disabled:opacity-50"
                    >
                      <X size={14} />
                      Reject
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {activeTab === 'approved' && (
        <div>
          {approvedApps.length === 0 ? (
            <div className="bg-white rounded-xl border border-slate-200 p-8 text-center text-sm text-slate-400">
              No approved candidates yet
            </div>
          ) : (
            <div className="space-y-3">
              {approvedApps.map((app) => (
                <div key={app.application_id} className="bg-white rounded-xl border border-slate-200 p-4 flex items-center justify-between">
                  <div>
                    <p className="font-medium text-slate-800 text-sm">{app.full_name}</p>
                    <p className="text-xs text-slate-500">Voter ID: {app.voter_id} • {app.email}</p>
                  </div>
                  <span className="text-xs bg-green-50 text-green-700 px-2 py-0.5 rounded-full font-medium">Approved</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {activeTab === 'control' && (
        <div className="bg-white rounded-xl border border-slate-200 p-6">
          <h3 className="font-medium text-slate-800 mb-4">Voting Control</h3>
          <p className="text-sm text-slate-500 mb-4">
            Current Status: <span className="font-medium text-slate-700">{election.status.replace('_', ' ').toUpperCase()}</span>
          </p>

          <div className="flex flex-wrap gap-3">
            {election.status === 'voting_active' && (
              <>
                <button
                  onClick={handlePause}
                  disabled={actionLoading === 'pause'}
                  className="flex items-center gap-2 bg-yellow-50 text-yellow-700 px-4 py-2 rounded-lg text-sm font-medium hover:bg-yellow-100 border border-yellow-200 disabled:opacity-50"
                >
                  <Pause size={16} />
                  Pause Voting
                </button>
                <button
                  onClick={handleEnd}
                  disabled={actionLoading === 'end'}
                  className="flex items-center gap-2 bg-red-50 text-red-700 px-4 py-2 rounded-lg text-sm font-medium hover:bg-red-100 border border-red-200 disabled:opacity-50"
                >
                  <StopCircle size={16} />
                  End Election
                </button>
              </>
            )}

            {election.status === 'paused' && (
              <>
                <button
                  onClick={handleResume}
                  disabled={actionLoading === 'resume'}
                  className="flex items-center gap-2 bg-green-50 text-green-700 px-4 py-2 rounded-lg text-sm font-medium hover:bg-green-100 border border-green-200 disabled:opacity-50"
                >
                  <Play size={16} />
                  Resume Voting
                </button>
                <button
                  onClick={handleEnd}
                  disabled={actionLoading === 'end'}
                  className="flex items-center gap-2 bg-red-50 text-red-700 px-4 py-2 rounded-lg text-sm font-medium hover:bg-red-100 border border-red-200 disabled:opacity-50"
                >
                  <StopCircle size={16} />
                  End Election
                </button>
              </>
            )}

            {election.status === 'ended' && (
              <p className="text-sm text-slate-500">This election has ended. No further actions available.</p>
            )}

            {!['voting_active', 'paused', 'ended'].includes(election.status) && (
              <p className="text-sm text-slate-500">Voting controls will be available once voting starts.</p>
            )}
          </div>
        </div>
      )}

      {activeTab === 'results' && (
        <div className="bg-white rounded-xl border border-slate-200 p-6">
          <h3 className="font-medium text-slate-800 mb-4">Election Results</h3>

          {results && results.results ? (
            <>
              <p className="text-sm text-slate-500 mb-4">Total votes: {results.total_votes}</p>

              <div className="space-y-3 mb-6">
                {results.results.map((candidate, index) => {
                  const maxVotes = results.results[0]?.vote_count || 1;
                  const percentage = results.total_votes > 0
                    ? Math.round((candidate.vote_count / results.total_votes) * 100)
                    : 0;

                  return (
                    <div key={candidate.candidate_id}>
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-sm font-medium text-slate-700">
                          {index === 0 && results.total_votes > 0 && '🏆 '}{candidate.full_name}
                        </span>
                        <span className="text-sm text-slate-500">{candidate.vote_count} votes ({percentage}%)</span>
                      </div>
                      <div className="w-full bg-slate-100 rounded-full h-2.5">
                        <div
                          className={`h-2.5 rounded-full ${index === 0 ? 'bg-blue-600' : 'bg-blue-300'}`}
                          style={{ width: `${results.total_votes > 0 ? (candidate.vote_count / maxVotes) * 100 : 0}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Voters List */}
              {results.voters && results.voters.length > 0 && (
                <div className="border-t border-slate-100 pt-4">
                  <h4 className="text-sm font-medium text-slate-700 mb-3 flex items-center gap-2">
                    <Users size={14} />
                    Voters ({results.voters.length})
                  </h4>
                  <div className="max-h-60 overflow-y-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="text-left text-xs text-slate-500 border-b border-slate-100">
                          <th className="pb-2 font-medium">Name</th>
                          <th className="pb-2 font-medium">Voter ID</th>
                          <th className="pb-2 font-medium">Voted At</th>
                        </tr>
                      </thead>
                      <tbody>
                        {results.voters.map((voter, i) => (
                          <tr key={i} className="border-b border-slate-50">
                            <td className="py-2 text-slate-700">{voter.full_name}</td>
                            <td className="py-2 font-mono text-slate-500">{voter.voter_id}</td>
                            <td className="py-2 text-slate-400">{formatDate(voter.voted_at)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </>
          ) : (
            <p className="text-sm text-slate-400">No results available yet.</p>
          )}
        </div>
      )}
    </div>
  );
}
