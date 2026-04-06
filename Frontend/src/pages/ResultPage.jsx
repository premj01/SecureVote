import { useState, useEffect } from 'react';
import { useParams, useLocation, useNavigate } from 'react-router-dom';
import { CheckCircle, BarChart3, Clock, ArrowLeft } from 'lucide-react';
import API from '../services/api';

export default function ResultPage() {
  const { electionId } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const justVoted = location.state?.justVoted;
  const electionTitle = location.state?.electionTitle;

  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadResults();
  }, [electionId]);

  const loadResults = async () => {
    try {
      const res = await API.get(`/elections/result/${electionId}`);
      setData(res.data);
    } catch (err) {
      console.error('Load results error:', err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-slate-400">Loading...</div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="max-w-md mx-auto px-4 py-12 text-center fade-in">
        <p className="text-slate-500">Could not load results.</p>
        <button onClick={() => navigate('/dashboard')} className="text-blue-600 hover:underline text-sm mt-2">
          Back to Dashboard
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-md mx-auto px-4 py-8 fade-in">
      {/* Success message if just voted */}
      {justVoted && (
        <div className="bg-green-50 border border-green-200 rounded-xl p-5 mb-6 text-center">
          <CheckCircle size={40} className="text-green-500 mx-auto mb-3" />
          <h2 className="text-lg font-bold text-green-800">Vote Cast Successfully!</h2>
          <p className="text-sm text-green-600 mt-1">
            You have successfully voted in <span className="font-medium">{electionTitle}</span>
          </p>
        </div>
      )}

      {/* Results section */}
      <div className="bg-white rounded-xl border border-slate-200 p-6">
        <div className="flex items-center gap-2 mb-4">
          <BarChart3 size={20} className="text-blue-600" />
          <h1 className="text-lg font-bold text-slate-800">Election Results</h1>
        </div>

        <h2 className="font-medium text-slate-700 mb-1">{data.election.title}</h2>

        {data.results_available ? (
          <>
            <p className="text-xs text-slate-400 mb-4">Total votes: {data.total_votes}</p>

            <div className="space-y-3">
              {data.results.map((candidate, index) => {
                const maxVotes = data.results[0]?.vote_count || 1;
                const percentage = data.total_votes > 0
                  ? Math.round((candidate.vote_count / data.total_votes) * 100)
                  : 0;

                return (
                  <div key={candidate.candidate_id} className="relative">
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex items-center gap-2">
                        {index === 0 && data.total_votes > 0 && (
                          <span className="text-xs bg-yellow-50 text-yellow-700 px-1.5 py-0.5 rounded font-medium"></span>
                        )}
                        <span className="text-sm font-medium text-slate-700">{candidate.full_name}</span>
                      </div>
                      <span className="text-sm text-slate-500">{candidate.vote_count} votes ({percentage}%)</span>
                    </div>
                    <div className="w-full bg-slate-100 rounded-full h-2.5">
                      <div
                        className={`h-2.5 rounded-full transition-all ${index === 0 ? 'bg-blue-600' : 'bg-blue-300'}`}
                        style={{ width: `${data.total_votes > 0 ? (candidate.vote_count / maxVotes) * 100 : 0}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        ) : (
          <div className="text-center py-8">
            <Clock size={32} className="text-slate-300 mx-auto mb-3" />
            <p className="text-slate-500 text-sm">Results will be available after voting ends.</p>
            <p className="text-xs text-slate-400 mt-1">
              Voting ends: {new Date(data.election.voting_end).toLocaleString()}
            </p>
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="mt-4 flex gap-3">
        <button
          onClick={() => navigate('/dashboard')}
          className="flex-1 flex items-center justify-center gap-2 bg-white text-slate-700 py-2.5 rounded-lg border border-slate-200 text-sm hover:bg-slate-50 transition-colors"
        >
          <ArrowLeft size={16} />
          Dashboard
        </button>
      </div>
    </div>
  );
}
