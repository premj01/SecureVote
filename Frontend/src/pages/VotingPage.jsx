import { useState } from 'react';
import { useParams, useLocation, useNavigate } from 'react-router-dom';
import { Vote, ChevronDown } from 'lucide-react';
import API from '../services/api';

export default function VotingPage() {
  const { electionId } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const { election, candidates } = location.state || {};

  const [selectedCandidate, setSelectedCandidate] = useState('');
  const [otp, setOtp] = useState('');
  const [otpSent, setOtpSent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  if (!election || !candidates) {
    return (
      <div className="max-w-md mx-auto px-4 py-12 text-center fade-in">
        <p className="text-slate-500 mb-4">Election data not found. Please go back and try again.</p>
        <button
          onClick={() => navigate('/dashboard')}
          className="bg-blue-600 text-white px-5 py-2 rounded-lg text-sm hover:bg-blue-700"
        >
          Back to Dashboard
        </button>
      </div>
    );
  }

  const handleRequestOtp = async () => {
    if (!selectedCandidate) {
      setError('Please select a candidate.');
      return;
    }

    setError('');
    setSuccess('');
    setLoading(true);

    try {
      await API.post('/elections/vote/request-otp', {
        election_id: parseInt(electionId),
        candidate_id: parseInt(selectedCandidate)
      });

      setOtpSent(true);
      setSuccess('OTP sent to your registered email. Enter it below to confirm your vote.');
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to send OTP. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyAndVote = async () => {
    if (!otp) {
      setError('Please enter OTP.');
      return;
    }

    setError('');
    setLoading(true);

    try {
      await API.post('/elections/vote/verify', {
        election_id: parseInt(electionId),
        otp
      });

      navigate(`/results/${electionId}`, {
        state: { justVoted: true, electionTitle: election.title }
      });
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to cast vote. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-md mx-auto px-4 py-8 fade-in">
      <div className="bg-white rounded-xl border border-slate-200 p-6">
        <div className="text-center mb-6">
          <div className="w-12 h-12 bg-blue-50 rounded-xl flex items-center justify-center mx-auto mb-3">
            <Vote size={24} className="text-blue-600" />
          </div>
          <h1 className="text-xl font-bold text-slate-800">{election.title}</h1>
          <p className="text-sm text-slate-500 mt-1">Select your candidate and cast your vote</p>
        </div>

        {success && (
          <div className="bg-emerald-50 text-emerald-700 text-sm px-4 py-2.5 rounded-lg mb-4 border border-emerald-100">
            {success}
          </div>
        )}

        {error && (
          <div className="bg-red-50 text-red-600 text-sm px-4 py-2.5 rounded-lg mb-4 border border-red-100">
            {error}
          </div>
        )}

        {/* Candidate Selection */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-slate-700 mb-2">Select Candidate</label>
          <div className="relative">
            <select
              value={selectedCandidate}
              onChange={(e) => setSelectedCandidate(e.target.value)}
              disabled={otpSent}
              className="w-full px-4 py-3 border border-slate-200 rounded-lg text-sm appearance-none focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white cursor-pointer"
            >
              <option value="">-- Choose a candidate --</option>
              {candidates.map((c) => (
                <option key={c.candidate_id} value={c.candidate_id}>
                  {c.full_name} {c.symbol_name ? `(${c.symbol_name})` : ''}
                </option>
              ))}
            </select>
            <ChevronDown size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
          </div>
        </div>

        {/* Selected candidate preview */}
        {selectedCandidate && (
          <div className="bg-blue-50 border border-blue-100 rounded-lg p-3 mb-6">
            <p className="text-sm text-blue-700">
              <span className="font-medium">Your selection:</span>{' '}
              {candidates.find(c => c.candidate_id === parseInt(selectedCandidate))?.full_name}
            </p>
          </div>
        )}

        {otpSent && (
          <div className="mb-4">
            <label className="block text-sm font-medium text-slate-700 mb-2">Enter OTP</label>
            <input
              type="text"
              inputMode="numeric"
              maxLength={6}
              value={otp}
              onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
              className="w-full px-4 py-3 border border-slate-200 rounded-lg text-sm tracking-[0.3em] text-center focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="000000"
            />
          </div>
        )}

        <button
          onClick={otpSent ? handleVerifyAndVote : handleRequestOtp}
          disabled={loading || !selectedCandidate}
          className="w-full bg-blue-600 text-white py-3 rounded-lg font-medium hover:bg-blue-700 transition-colors disabled:opacity-50 text-sm"
        >
          {loading ? 'Please wait...' : otpSent ? 'Verify OTP & Cast Vote' : 'Send OTP'}
        </button>

        {otpSent && (
          <button
            onClick={() => {
              setOtp('');
              setOtpSent(false);
              setSuccess('');
              setError('');
            }}
            className="w-full mt-3 border border-slate-200 text-slate-600 py-3 rounded-lg font-medium hover:bg-slate-50 transition-colors text-sm"
          >
            Change Candidate
          </button>
        )}

        <p className="text-xs text-slate-400 text-center mt-3">
          Your vote is anonymous and cannot be changed after submission.
        </p>
      </div>
    </div>
  );
}
