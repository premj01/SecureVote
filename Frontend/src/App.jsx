import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Home from './pages/Home';
import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard';
import VotingPage from './pages/VotingPage';
import ResultPage from './pages/ResultPage';
import ApplyCandidate from './pages/ApplyCandidate';
import AdminDashboard from './pages/admin/AdminDashboard';
import CreateElection from './pages/admin/CreateElection';
import ManageElection from './pages/admin/ManageElection';
import Navbar from './components/Navbar';

function ProtectedRoute({ children, adminOnly = false }) {
  const token = localStorage.getItem('token');
  const user = JSON.parse(localStorage.getItem('user') || '{}');

  if (!token) return <Navigate to="/login" />;
  if (adminOnly && user.role !== 'admin') return <Navigate to="/dashboard" />;

  return children;
}

function App() {
  return (
    <Router>
      <div className="min-h-screen bg-slate-50">
        <Navbar />
        <main>
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route path="/dashboard" element={
              <ProtectedRoute><Dashboard /></ProtectedRoute>
            } />
            <Route path="/vote/:electionId" element={
              <ProtectedRoute><VotingPage /></ProtectedRoute>
            } />
            <Route path="/results/:electionId" element={
              <ProtectedRoute><ResultPage /></ProtectedRoute>
            } />
            <Route path="/apply/:electionId" element={
              <ProtectedRoute><ApplyCandidate /></ProtectedRoute>
            } />
            <Route path="/admin" element={
              <ProtectedRoute adminOnly><AdminDashboard /></ProtectedRoute>
            } />
            <Route path="/admin/create-election" element={
              <ProtectedRoute adminOnly><CreateElection /></ProtectedRoute>
            } />
            <Route path="/admin/election/:id" element={
              <ProtectedRoute adminOnly><ManageElection /></ProtectedRoute>
            } />
          </Routes>
        </main>
      </div>
    </Router>
  );
}

export default App;
