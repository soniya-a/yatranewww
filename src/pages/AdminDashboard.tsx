import React, { useState, useEffect } from 'react';
import { ArrowLeft, Plus, Trash2, Database, UploadCloud } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { db, auth, handleFirestoreError, OperationType, getDocsWithTimeout } from '../lib/firebase';
import { collection, addDoc, getDocs, deleteDoc, doc } from 'firebase/firestore';

export default function AdminDashboard() {
  const navigate = useNavigate();
  const [companies, setCompanies] = useState<any[]>([]);
  const [newCompany, setNewCompany] = useState("");
  const [newRole, setNewRole] = useState("");
  const [newDifficulty, setNewDifficulty] = useState("Medium");
  const [newQuestions, setNewQuestions] = useState("");

  const fetchCompanies = async () => {
    const pathStr = 'companies';
    try {
      const snap = await getDocsWithTimeout(collection(db, pathStr));
      setCompanies(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    } catch (e) {
      console.warn("Could not fetch companies from Firestore (offline/timeout).", e);
      // Fallback: load some default samples if offline to keep admin UI neat
      setCompanies([
        { id: "fallback-google", company: "Google India", role: "Web Developer Intern", difficulty: "Medium", questions: ["Explain React Render properties", "Detail async/await states"] },
        { id: "fallback-intel", company: "Intel India", role: "AI Software Intern", difficulty: "Medium", questions: ["Tune training oscillations", "Quantize PyTorch model states"] }
      ]);
    }
  };

  useEffect(() => {
    fetchCompanies();
  }, []);

  const handleAddCompany = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCompany || !newRole || !newQuestions) return;
    const pathStr = 'companies';
    try {
      await addDoc(collection(db, pathStr), {
        company: newCompany,
        role: newRole,
        difficulty: newDifficulty,
        questions: newQuestions.split('\n').map(q => q.trim()).filter(Boolean)
      });
      setNewCompany("");
      setNewRole("");
      setNewQuestions("");
      fetchCompanies();
    } catch (e) {
      handleFirestoreError(e, OperationType.CREATE, pathStr);
    }
  };

  const handleDelete = async (id: string) => {
    const docPath = `companies/${id}`;
    try {
      await deleteDoc(doc(db, 'companies', id));
      fetchCompanies();
    } catch (e) {
      handleFirestoreError(e, OperationType.DELETE, docPath);
    }
  };

  return (
    <div className="min-h-screen bg-zinc-50 text-zinc-900 p-8">
      <div className="max-w-6xl mx-auto space-y-8">
        <header className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button onClick={() => navigate('/')} className="p-2 hover:bg-zinc-100 border border-zinc-200 rounded-lg shadow-sm text-zinc-700 transition-colors">
              <ArrowLeft className="w-5 h-5" />
            </button>
            <h1 className="text-3xl font-bold flex items-center gap-2"><Database className="w-6 h-6 text-cyan-600" /> Admin Dashboard</h1>
          </div>
          <div className="text-sm text-zinc-550">Manage Interview Datasets</div>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Add Form */}
          <div className="bg-white border border-zinc-200 shadow-sm rounded-2xl p-6 lg:col-span-1">
            <h2 className="text-xl font-bold mb-4 flex items-center gap-2"><UploadCloud className="w-5 h-5 text-blue-600" /> Add Dataset</h2>
            <form onSubmit={handleAddCompany} className="space-y-4">
              <div>
                <label className="text-xs text-zinc-400 font-bold uppercase">Company</label>
                <input required value={newCompany} onChange={e => setNewCompany(e.target.value)} type="text" placeholder="e.g. Google" className="w-full bg-zinc-50 border border-zinc-200 rounded-xl px-4 py-2 mt-1 focus:outline-none focus:border-cyan-500 text-zinc-805 text-sm" />
              </div>
              <div>
                <label className="text-xs text-zinc-400 font-bold uppercase">Role</label>
                <input required value={newRole} onChange={e => setNewRole(e.target.value)} type="text" placeholder="e.g. Embedded Engineer" className="w-full bg-zinc-50 border border-zinc-200 rounded-xl px-4 py-2 mt-1 focus:outline-none focus:border-cyan-500 text-zinc-805 text-sm" />
              </div>
              <div>
                <label className="text-xs text-zinc-400 font-bold uppercase">Difficulty</label>
                <select value={newDifficulty} onChange={e => setNewDifficulty(e.target.value)} className="w-full bg-zinc-50 border border-zinc-200 rounded-xl px-4 py-2 mt-1 focus:outline-none focus:border-cyan-500 text-zinc-805 text-sm">
                  <option>Easy</option>
                  <option>Medium</option>
                  <option>Hard</option>
                </select>
              </div>
              <div>
                <label className="text-xs text-zinc-400 font-bold uppercase">Questions (One per line)</label>
                <textarea required value={newQuestions} onChange={e => setNewQuestions(e.target.value)} rows={4} className="w-full bg-zinc-50 border border-zinc-200 rounded-xl px-4 py-2 mt-1 focus:outline-none focus:border-cyan-500 text-zinc-805 text-sm resize-none"></textarea>
              </div>
              <button type="submit" className="w-full py-3 bg-cyan-600 hover:bg-cyan-700 text-white rounded-xl font-bold transition-colors flex items-center justify-center gap-2 shadow-sm">
                <Plus className="w-4 h-4" /> Save Dataset
              </button>
            </form>
          </div>

          {/* Dataset List */}
          <div className="bg-white border border-zinc-200 shadow-sm rounded-2xl p-6 lg:col-span-2">
            <h2 className="text-xl font-bold mb-4 text-zinc-900">Saved Datasets</h2>
            <div className="overflow-x-auto">
              {companies.length === 0 ? (
                <div className="text-center py-8 text-zinc-400">No datasets found. Create one to get started.</div>
              ) : (
                <table className="w-full text-left text-sm">
                  <thead>
                    <tr className="border-b border-zinc-200 text-zinc-400">
                      <th className="pb-3 font-medium">Company</th>
                      <th className="pb-3 font-medium">Role</th>
                      <th className="pb-3 font-medium">Questions</th>
                      <th className="pb-3 font-medium text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {companies.map(c => (
                      <tr key={c.id} className="border-b border-zinc-100/70 group">
                        <td className="py-4 font-medium text-zinc-900">{c.company}</td>
                        <td className="py-4 text-zinc-600">
                          {c.role}
                          <span className="ml-2 text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-zinc-100 text-zinc-650 border border-zinc-200">{c.difficulty}</span>
                        </td>
                        <td className="py-4 text-zinc-500">{c.questions?.length || 0}</td>
                        <td className="py-4 text-right">
                          <button onClick={() => handleDelete(c.id)} className="text-rose-600 hover:text-rose-750 transition-colors p-2">
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
