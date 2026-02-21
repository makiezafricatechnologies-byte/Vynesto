'use client';

import { useState } from 'react';
import { useFirestore, useUser, useStorage, useDoc, useMemoFirebase } from '@/firebase';
import { doc } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Building2, Upload, CheckCircle2, Loader2, FileText, ShieldCheck } from 'lucide-react';
import { setDocumentNonBlocking } from '@/firebase/non-blocking-updates';

export default function BusinessPage() {
  const { db } = useFirestore();
  const { user } = useUser();
  const storage = useStorage();

  const [saving, setSaving] = useState(false);
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [certFile, setCertFile] = useState<File | null>(null);

  const businessDocRef = useMemoFirebase(() => {
    if (!db) return null;
    return doc(db, 'business', 'config');
  }, [db]);
  const { data: businessConfig, isLoading: isConfigLoading } = useDoc(businessDocRef);

  async function handleSave() {
    if (!db || !user) return;
    setSaving(true);

    try {
      let logoUrl = businessConfig?.logoUrl || '';
      let registrationCertUrl = businessConfig?.registrationCertUrl || '';

      const uploads = [];
      
      if (logoFile) {
        const logoRef = ref(storage, `business/logo_${Date.now()}`);
        uploads.push(uploadBytes(logoRef, logoFile).then(snap => getDownloadURL(snap.ref).then(url => { logoUrl = url; })));
      }

      if (certFile) {
        const certRef = ref(storage, `business/cert_${Date.now()}`);
        uploads.push(uploadBytes(certRef, certFile).then(snap => getDownloadURL(snap.ref).then(url => { registrationCertUrl = url; })));
      }

      if (uploads.length > 0) {
        await Promise.all(uploads);
      }

      const updateData = {
        logoUrl,
        registrationCertUrl,
        updatedAt: new Date().toISOString(),
        updatedBy: user.uid
      };

      setDocumentNonBlocking(doc(db, 'business', 'config'), updateData, { merge: true });
      
      setLogoFile(null);
      setCertFile(null);
    } finally {
      setSaving(false);
    }
  }

  if (isConfigLoading) {
    return <div className="flex items-center justify-center p-24"><Loader2 className="animate-spin text-primary w-12 h-12" /></div>;
  }

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="p-3 bg-primary/10 rounded-2xl">
            <Building2 className="w-8 h-8 text-primary" />
          </div>
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-foreground">Official Business Identity</h1>
            <p className="text-muted-foreground">Manage your brand assets and registration credentials.</p>
          </div>
        </div>
        <div className="flex items-center gap-2 px-4 py-2 bg-green-50 border border-green-100 rounded-full">
          <ShieldCheck className="w-4 h-4 text-green-600" />
          <span className="text-xs font-bold text-green-700">Verified Admin Access</span>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <Card className="border-2 shadow-xl overflow-hidden rounded-3xl">
          <CardHeader className="bg-muted/50 border-b">
            <CardTitle className="flex items-center gap-2 text-lg">
              <Upload className="w-5 h-5 text-primary" /> Brand Logo
            </CardTitle>
            <CardDescription>Upload high-resolution square logo.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6 pt-6">
            <div className="aspect-square rounded-2xl border-2 border-dashed flex flex-col items-center justify-center bg-muted/30 relative overflow-hidden group">
              {logoFile ? (
                <img src={URL.createObjectURL(logoFile)} className="object-contain w-full h-full p-6" alt="Preview" />
              ) : businessConfig?.logoUrl ? (
                <img src={businessConfig.logoUrl} className="object-contain w-full h-full p-6" alt="Current Logo" />
              ) : (
                <div className="text-center p-6 opacity-40">
                  <Building2 className="w-16 h-16 mx-auto mb-2" />
                  <p className="text-xs font-bold uppercase tracking-widest">Awaiting Logo</p>
                </div>
              )}
            </div>
            <Input 
              type="file" 
              accept="image/*" 
              onChange={e => setLogoFile(e.target.files?.[0] || null)}
              className="cursor-pointer h-12"
            />
          </CardContent>
        </Card>

        <Card className="border-2 shadow-xl overflow-hidden rounded-3xl">
          <CardHeader className="bg-muted/50 border-b">
            <CardTitle className="flex items-center gap-2 text-lg">
              <FileText className="w-5 h-5 text-primary" /> Registration Cert
            </CardTitle>
            <CardDescription>Upload valid operating certificate.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6 pt-6">
            <div className="aspect-square rounded-2xl border-2 border-dashed flex flex-col items-center justify-center bg-muted/30">
              {certFile ? (
                <div className="text-center p-6">
                  <CheckCircle2 className="w-16 h-16 text-green-500 mx-auto mb-4" />
                  <p className="text-sm font-bold truncate max-w-[200px]">{certFile.name}</p>
                </div>
              ) : businessConfig?.registrationCertUrl ? (
                <div className="text-center p-6">
                  <CheckCircle2 className="w-16 h-16 text-primary mx-auto mb-4" />
                  <p className="text-sm font-bold mb-4">Document Verified</p>
                  <Button variant="secondary" size="sm" asChild>
                    <a href={businessConfig.registrationCertUrl} target="_blank">View Certificate</a>
                  </Button>
                </div>
              ) : (
                <div className="text-center p-6 opacity-40">
                  <FileText className="w-16 h-16 mx-auto mb-2" />
                  <p className="text-xs font-bold uppercase tracking-widest">No Certificate Found</p>
                </div>
              )}
            </div>
            <Input 
              type="file" 
              accept=".pdf,image/*" 
              onChange={e => setCertFile(e.target.files?.[0] || null)}
              className="cursor-pointer h-12"
            />
          </CardContent>
        </Card>
      </div>

      <div className="flex justify-end pt-8 border-t-2">
        <Button 
          size="lg" 
          onClick={handleSave} 
          disabled={saving || (!logoFile && !certFile)}
          className="px-12 h-16 text-xl font-bold shadow-2xl transition-all hover:scale-[1.02] active:scale-95 rounded-2xl"
        >
          {saving ? <Loader2 className="animate-spin mr-2" /> : <CheckCircle2 className="w-6 h-6 mr-2" />}
          {saving ? 'Syncing Credentials...' : 'Lock In Business Assets'}
        </Button>
      </div>
    </div>
  );
}