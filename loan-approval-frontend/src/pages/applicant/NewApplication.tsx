import { useState, useRef, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import api from '../../api/axios';
import { Upload, Save, Send, AlertCircle, CheckCircle, Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';

interface FormData {
  applicantName: string; dob: string; gender: string; pan: string; aadhaar: string;
  phone: string; email: string; address: string; occupation: string; employer: string;
  monthlyIncome: string; loanAmount: string; loanPurpose: string; bankDetails: string;
}

const emptyForm: FormData = {
  applicantName: '', dob: '', gender: '', pan: '', aadhaar: '', phone: '', email: '',
  address: '', occupation: '', employer: '', monthlyIncome: '', loanAmount: '',
  loanPurpose: '', bankDetails: '',
};

export default function NewApplication() {
  const { id: editId } = useParams();
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [appId, setAppId] = useState<string | null>(editId || null);
  const [form, setForm] = useState<FormData>(emptyForm);
  const [extractedFields, setExtractedFields] = useState<Record<string, { value: string; confidence: number }>>({});
  const [submitting, setSubmitting] = useState(false);
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();

  useEffect(() => {
    if (editId) {
      api.get(`/applications/${editId}`).then((r) => {
        const d = r.data;
        setForm({
          applicantName: d.applicantName || '', dob: d.dob || '', gender: d.gender || '',
          pan: d.pan || '', aadhaar: d.aadhaar || '', phone: d.phone || '',
          email: d.email || '', address: d.address || '', occupation: d.occupation || '',
          employer: d.employer || '', monthlyIncome: d.monthlyIncome?.toString() || '',
          loanAmount: d.loanAmount?.toString() || '', loanPurpose: d.loanPurpose || '',
          bankDetails: d.bankDetails || '',
        });
        const extracted: Record<string, { value: string; confidence: number }> = {};
        d.extractedFields?.forEach((ef: any) => {
          extracted[ef.fieldName] = { value: ef.fieldValue || '', confidence: ef.confidence || 1 };
        });
        setExtractedFields(extracted);
        if (d.pdfPath) setPdfUrl(`http://localhost:8080/uploads/${d.pdfPath.split('\\').pop() || d.pdfPath.split('/').pop()}`);
      }).catch(() => toast.error('Failed to load application'));
    }
  }, [editId]);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    if (f.type !== 'application/pdf') { toast.error('Only PDF files are allowed'); return; }
    if (f.size > 20 * 1024 * 1024) { toast.error('File exceeds 20MB'); return; }

    setFile(f);
    setUploading(true);
    const fd = new FormData();
    fd.append('file', f);
    try {
      const res = await api.post('/upload', fd, { headers: { 'Content-Type': 'multipart/form-data' } });
      setAppId(res.data.applicationId);
      toast.success('PDF uploaded! AI extraction in progress...');

      const app = await api.get(`/applications/${res.data.applicationId}`);
      if (app.data.pdfPath) {
        const fileName = app.data.pdfPath.split('\\').pop() || app.data.pdfPath.split('/').pop();
        setPdfUrl(`http://localhost:8080/uploads/${fileName}`);
      }
      const extracted: Record<string, { value: string; confidence: number }> = {};
      app.data.extractedFields?.forEach((ef: any) => {
        extracted[ef.fieldName] = { value: ef.fieldValue || '', confidence: ef.confidence || 1 };
      });
      setExtractedFields(extracted);

      const d = app.data;
      setForm({
        applicantName: d.applicantName || '', dob: d.dob || '', gender: d.gender || '',
        pan: d.pan || '', aadhaar: d.aadhaar || '', phone: d.phone || '',
        email: d.email || '', address: d.address || '', occupation: d.occupation || '',
        employer: d.employer || '', monthlyIncome: d.monthlyIncome?.toString() || '',
        loanAmount: d.loanAmount?.toString() || '', loanPurpose: d.loanPurpose || '',
        bankDetails: d.bankDetails || '',
      });
    } catch (err: any) {
      const msg = err.response?.data?.message || err.message || 'Upload failed';
      console.error('Upload error:', err.response?.status, err.response?.data, err);
      toast.error(msg);
    } finally {
      setUploading(false);
    }
  };

  const updateField = (field: keyof FormData, value: string) => setForm((f) => ({ ...f, [field]: value }));

  const getFieldStyle = (field: string) => {
    const ef = extractedFields[field];
    if (!ef || ef.value === '') return 'border-red-300 dark:border-red-500 bg-red-50 dark:bg-red-900/20';
    if (ef.confidence < 0.7) return 'border-yellow-300 dark:border-yellow-500 bg-yellow-50 dark:bg-yellow-900/20';
    return 'border-gray-200 dark:border-slate-600';
  };

  const getFieldBadge = (field: string) => {
    const ef = extractedFields[field];
    if (!ef || ef.value === '') return <AlertCircle className="w-4 h-4 text-red-500" title="Missing" />;
    if (ef.confidence < 0.7) return <AlertCircle className="w-4 h-4 text-yellow-500" title="Needs Verification" />;
    return <CheckCircle className="w-4 h-4 text-green-500" title="Verified" />;
  };

  const handleSaveDraft = async () => {
    if (!appId) { toast.error('Upload a PDF first'); return; }
    try {
      await api.put(`/applications/${appId}`, form);
      toast.success('Draft saved!');
    } catch { toast.error('Failed to save'); }
  };

  const handleSubmit = async () => {
    if (!appId) { toast.error('Upload a PDF first'); return; }
    setSubmitting(true);
    try {
      await api.post(`/applications/${appId}/submit`, form);
      toast.success('Application submitted successfully!');
      navigate('/applicant/applications');
    } catch (err: any) {
      toast.error(err.response?.data?.validation?.errors?.[0] || err.response?.data?.message || 'Submission failed');
    } finally {
      setSubmitting(false);
    }
  };

  const fieldMeta: { key: keyof FormData; label: string }[] = [
    { key: 'applicantName', label: 'Applicant Name' },
    { key: 'dob', label: 'DOB' },
    { key: 'gender', label: 'Gender' },
    { key: 'pan', label: 'PAN' },
    { key: 'aadhaar', label: 'Aadhaar' },
    { key: 'phone', label: 'Phone' },
    { key: 'email', label: 'Email' },
    { key: 'address', label: 'Address' },
    { key: 'occupation', label: 'Occupation' },
    { key: 'employer', label: 'Employer' },
    { key: 'monthlyIncome', label: 'Monthly Income' },
    { key: 'loanAmount', label: 'Loan Amount' },
    { key: 'loanPurpose', label: 'Loan Purpose' },
    { key: 'bankDetails', label: 'Bank Details' },
  ];

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-900 dark:text-white">New Application</h1>

      {!appId ? (
        <div className="bg-white dark:bg-slate-800 rounded-xl p-8 shadow-sm border border-gray-100 dark:border-slate-700 text-center">
          <div className="w-16 h-16 rounded-full bg-primary-100 dark:bg-primary-900/30 flex items-center justify-center mx-auto mb-4">
            <Upload className="w-8 h-8 text-primary-600 dark:text-primary-400" />
          </div>
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">Upload Document</h2>
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">Upload salary slip, bank statement, PAN card, Aadhaar, or any loan document</p>
          <input ref={fileRef} type="file" accept="application/pdf" onChange={handleUpload} hidden />
          <button onClick={() => fileRef.current?.click()} disabled={uploading}
            className="px-6 py-3 bg-primary-600 text-white rounded-xl hover:bg-primary-700 disabled:opacity-50 inline-flex items-center gap-2">
            {uploading ? <><Loader2 className="w-5 h-5 animate-spin" /> Processing...</> : <><Upload className="w-5 h-5" /> Upload PDF</>}
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-gray-100 dark:border-slate-700 p-4">
            <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">PDF Preview</h3>
            {pdfUrl ? (
              <object data={pdfUrl} type="application/pdf" className="w-full h-[500px] rounded-lg border border-gray-200 dark:border-slate-600">
                <iframe src={pdfUrl} className="w-full h-[500px]" title="PDF Preview">
                  <p>PDF cannot be displayed. <a href={pdfUrl} target="_blank" className="text-primary-600 underline">Download</a></p>
                </iframe>
              </object>
            ) : file ? (
              <div className="bg-gray-100 dark:bg-slate-700 rounded-lg p-4 text-center text-sm text-gray-500">
                <p className="font-medium text-gray-700 dark:text-gray-300">{file.name}</p>
                <p className="text-xs mt-1">{(file.size / 1024 / 1024).toFixed(2)} MB</p>
              </div>
            ) : (
              <div className="bg-gray-100 dark:bg-slate-700 rounded-lg p-4 text-center text-sm text-gray-400">
                Upload a PDF to preview
              </div>
            )}
          </div>

          <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-gray-100 dark:border-slate-700 p-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Extracted Information</h3>
            <div className="space-y-3">
              {fieldMeta.map(({ key, label }) => (
                <div key={key}>
                  <label className="flex items-center gap-1.5 text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
                    {getFieldBadge(key)} {label}
                  </label>
                  <input type="text" value={form[key]} onChange={(e) => updateField(key, e.target.value)}
                    className={`w-full px-3 py-2 rounded-lg border text-sm bg-white dark:bg-slate-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500 ${getFieldStyle(key)}`} />
                </div>
              ))}
            </div>
          </div>

          <div className="lg:col-span-2 flex justify-end gap-3">
            <button onClick={handleSaveDraft} className="px-5 py-2.5 rounded-xl border border-gray-200 dark:border-slate-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-slate-700 inline-flex items-center gap-2">
              <Save className="w-4 h-4" /> Save Draft
            </button>
            <button onClick={handleSubmit} disabled={submitting}
              className="px-5 py-2.5 rounded-xl bg-primary-600 text-white hover:bg-primary-700 disabled:opacity-50 inline-flex items-center gap-2">
              {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
              Submit Application
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
