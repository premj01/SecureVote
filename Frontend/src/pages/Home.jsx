import { Link } from 'react-router-dom';
import { Shield, Vote, Users, Lock } from 'lucide-react';

export default function Home() {
  return (
    <div className="fade-in">
      {/* Hero Section */}
      <div className="bg-white border-b border-slate-100">
        <div className="max-w-4xl mx-auto px-4 py-16 text-center">
          <div className="w-16 h-16 bg-blue-100 rounded-2xl flex items-center justify-center mx-auto mb-6">
            <Shield size={32} className="text-blue-600" />
          </div>
          <h1 className="text-3xl sm:text-4xl font-bold text-slate-800 mb-4">
            Secure Election Voting System
          </h1>
          <p className="text-slate-500 text-lg mb-8 max-w-xl mx-auto">
            A trusted platform for conducting fair and transparent elections. 
            Cast your vote securely and view results with confidence.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link
              to="/register"
              className="bg-blue-600 text-white px-6 py-2.5 rounded-lg font-medium hover:bg-blue-700 transition-colors"
            >
              Get Started
            </Link>
            <Link
              to="/login"
              className="bg-white text-slate-700 px-6 py-2.5 rounded-lg font-medium border border-slate-200 hover:bg-slate-50 transition-colors"
            >
              Login to Vote
            </Link>
          </div>
        </div>
      </div>

      {/* Features */}
      <div className="max-w-4xl mx-auto px-4 py-16">
        <h2 className="text-xl font-semibold text-slate-800 text-center mb-10">How It Works</h2>
        <div className="grid sm:grid-cols-3 gap-6">
          <div className="bg-white rounded-xl border border-slate-200 p-6 text-center">
            <div className="w-12 h-12 bg-blue-50 rounded-xl flex items-center justify-center mx-auto mb-4">
              <Users size={24} className="text-blue-600" />
            </div>
            <h3 className="font-medium text-slate-800 mb-2">Register & Login</h3>
            <p className="text-sm text-slate-500">Create your account and get a unique Voter ID to participate in elections.</p>
          </div>
          <div className="bg-white rounded-xl border border-slate-200 p-6 text-center">
            <div className="w-12 h-12 bg-blue-50 rounded-xl flex items-center justify-center mx-auto mb-4">
              <Vote size={24} className="text-blue-600" />
            </div>
            <h3 className="font-medium text-slate-800 mb-2">Cast Your Vote</h3>
            <p className="text-sm text-slate-500">Enter the Election ID, select your candidate, and cast your vote securely.</p>
          </div>
          <div className="bg-white rounded-xl border border-slate-200 p-6 text-center">
            <div className="w-12 h-12 bg-blue-50 rounded-xl flex items-center justify-center mx-auto mb-4">
              <Lock size={24} className="text-blue-600" />
            </div>
            <h3 className="font-medium text-slate-800 mb-2">View Results</h3>
            <p className="text-sm text-slate-500">Results are visible only after voting ends. Your vote stays completely anonymous.</p>
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="border-t border-slate-200 bg-white">
        <div className="max-w-4xl mx-auto px-4 py-6 text-center text-sm text-slate-400">
          © 2026 SecureVote — Built for secure and transparent elections
        </div>
      </footer>
    </div>
  );
}
