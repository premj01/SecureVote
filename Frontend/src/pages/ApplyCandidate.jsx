import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { FileText, ArrowLeft } from 'lucide-react';
import API from '../services/api';

export default function ApplyCandidate() {
  const { electionId } = useParams();
  const navigate = useNavigate();

  const [election, setElection] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    loadElection();
  }, []);

  const loadElection = async () => {
    try {
      const res = await API.get('/elections/upcoming');
      const found = res.data.elections.find(e => e.election_id === parseInt(electionId));
      setElection(found);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const declarationText = election
    ? `I hereby declare my intention to stand as a candidate in the election titled "${election.title}" and agree to abide by the rules and regulations governing this election.`
    : '';

  const handleSubmit = async () => {
    setError('');
    setSubmitting(true);

    try {
      await API.post('/elections/apply-candidate', {
        election_id: parseInt(electionId),
        declaration_text: declarationText
      });
      setSuccess(true);
    } catch (err) {
      setError(err.response?.data?.error || 'Application failed.');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-slate-400">Loading...</div>
      </div>
    );
  }

  if (success) {
    return (
      <div className="max-w-md mx-auto px-4 py-12 text-center fade-in">
        <div className="bg-white rounded-xl border border-slate-200 p-8">
          <div className="w-14 h-14 bg-green-50 rounded-full flex items-center justify-center mx-auto mb-4">
            <FileText size={28} className="text-green-600" />
          </div>
          <h2 className="text-xl font-bold text-slate-800 mb-2">Application Submitted!</h2>
          <p className="text-sm text-slate-500 mb-6">
            Your candidate application for <span className="font-medium">{election?.title}</span> has been submitted.
            The admin will review your application.
          </p>
          <button
            onClick={() => navigate('/dashboard')}
            className="bg-blue-600 text-white px-5 py-2.5 rounded-lg text-sm hover:bg-blue-700"
          >
            Back to Dashboard
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-md mx-auto px-4 py-8 fade-in">
      <button
        onClick={() => navigate('/dashboard')}
        className="flex items-center gap-1 text-sm text-slate-500 hover:text-slate-700 mb-4"
      >
        <ArrowLeft size={16} />
        Back
      </button>

      <div className="bg-white rounded-xl border border-slate-200 p-6">
        <h1 className="text-lg font-bold text-slate-800 mb-1">Candidate Application</h1>
        <p className="text-sm text-slate-500 mb-5">{election?.title}</p>

        {error && (
          <div className="bg-red-50 text-red-600 text-sm px-4 py-2.5 rounded-lg mb-4 border border-red-100">
            {error}
          </div>
        )}

        {/* Declaration */}
        <div className="mb-5">
          <label className="block text-sm font-medium text-slate-700 mb-2">Candidate Declaration</label>
          <div className="bg-slate-50 border border-slate-200 rounded-lg p-4 text-sm text-slate-600 leading-relaxed">
            {declarationText}
          </div>
        </div>

        <p className="text-xs text-slate-400 mb-4">
          By submitting, you agree to the above declaration and the election rules.
        </p>

        <button
          onClick={handleSubmit}
          disabled={submitting}
          className="w-full bg-blue-600 text-white py-2.5 rounded-lg font-medium hover:bg-blue-700 transition-colors disabled:opacity-50 text-sm"
        >
          {submitting ? 'Submitting...' : 'Submit Application'}
        </button>
      </div>
    </div>
  );
}
