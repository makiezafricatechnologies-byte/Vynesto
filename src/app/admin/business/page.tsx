'use client';

import { useState } from 'react';
import { useFirestore, useUser, useStorage, useDoc, useMemoFirebase } from '@/firebase';
import { doc } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Building2, Upload, CheckCircle2, Loader2, FileText } from 'lucide-react';
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

      // Upload files in parallel for speed
      const uploads = [];
      
      if (logoFile) {
        const logoRef = ref(storage, `business/logo_${Date.now()}`);
        uploads.push(uploadBytes(logoRef, logoFile).then(snap => getDownloadURL(snap.ref).then(url => { logoUrl = url; })));
      }

      if (certFile) {
        const certRef = ref(storage, `business/cert_${Date.now()}`);
        uploads.push(uploadBytes(certRef, certFile).then(snap => getDownloadURL(snap.ref).then(url => { registrationCertUrl = url; })));
      }

      await Promise.all(uploads);

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
      setSaving(true);
      setTimeout(() => setSaving(false), 2000);
    }
  }

  if (isConfigLoading) {
    return <div className="flex justify-center p-12"><Loader2 className="animate-spin text-primary" /></div>;
  }

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <div className="flex items-center gap-4 mb-8">
        <div className="p-3 bg-primary/10 rounded-xl">
          <Building2 className="w-8 h-8 text-primary" />
        </div>
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground">Official Business Identity</h1>
          <p className="text-muted-foreground">Manage your store logo and registration credentials.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <Card className="border-2 hover:border-primary/20 transition-all shadow-lg overflow-hidden">
          <CardHeader className="bg-muted/50">
            <CardTitle className="flex items-center gap-2 text-lg">
              <Upload className="w-5 h-5 text-primary" /> Store Logo
            </CardTitle>
            <CardDescription>Upload your official brand logo.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6 pt-6">
            <div className="aspect-square rounded-2xl border-2 border-dashed flex flex-col items-center justify-center bg-muted/30 relative overflow-hidden group">
              {logoFile ? (
                <img src={URL.createObjectURL(logoFile)} className="object-contain w-full h-full p-4" alt="New Logo" />
              ) : businessConfig?.logoUrl ? (
                <img src={businessConfig.logoUrl} className="object-contain w-full h-full p-4" alt="Current Logo" />
              ) : (
                <div className="text-center p-6">
                  <Building2 className="w-12 h-12 text-muted-foreground mx-auto mb-2 opacity-50" />
                  <p className="text-xs text-muted-foreground">No Logo Uploaded</p>
                </div>
              )}
            </div>
            <Input 
              type="file" 
              accept="image/*" 
              onChange={e => setLogoFile(e.target.files?.[0] || null)}
              className="cursor-pointer file:bg-primary file:text-primary-foreground file:border-0 file:rounded-md file:px-4 file:py-1 file:mr-4"
            />
          </CardContent>
        </Card>

        <Card className="border-2 hover:border-primary/20 transition-all shadow-lg overflow-hidden">
          <CardHeader className="bg-muted/50">
            <CardTitle className="flex items-center gap-2 text-lg">
              <FileText className="w-5 h-5 text-primary" /> Registration Cert
            </CardTitle>
            <CardDescription>Upload official certificate (PDF/Image).</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6 pt-6">
            <div className="aspect-square rounded-2xl border-2 border-dashed flex flex-col items-center justify-center bg-muted/30">
              {certFile ? (
                <div className="text-center p-6">
                  <CheckCircle2 className="w-12 h-12 text-green-500 mx-auto mb-2" />
                  <p className="text-sm font-medium truncate max-w-[150px]">{certFile.name}</p>
                </div>
              ) : businessConfig?.registrationCertUrl ? (
                <div className="text-center p-6">
                  <CheckCircle2 className="w-12 h-12 text-primary mx-auto mb-2" />
                  <p className="text-sm font-medium">Document Secured</p>
                  <a href={businessConfig.registrationCertUrl} target="_blank" className="text-xs text-primary font-bold underline mt-2 block hover:text-primary/80">View Document</a>
                </div>
              ) : (
                <div className="text-center p-6">
                  <FileText className="w-12 h-12 text-muted-foreground mx-auto mb-2 opacity-50" />
                  <p className="text-xs text-muted-foreground">No Certificate Found</p>
                </div>
              )}
            </div>
            <Input 
              type="file" 
              accept=".pdf,image/*" 
              onChange={e => setCertFile(e.target.files?.[0] || null)}
              className="cursor-pointer file:bg-primary file:text-primary-foreground file:border-0 file:rounded-md file:px-4 file:py-1 file:mr-4"
            />
          </CardContent>
        </Card>
      </div>

      <div className="flex justify-end pt-6 border-t">
        <Button 
          size="lg" 
          onClick={handleSave} 
          disabled={saving || (!logoFile && !certFile)}
          className="px-12 h-14 text-lg font-bold shadow-xl transition-all hover:scale-105 active:scale-95"
        >
          {saving ? <Loader2 className="animate-spin mr-2" /> : <CheckCircle2 className="w-5 h-5 mr-2" />}
          {saving ? 'Saving Credentials...' : 'Sync Business Assets'}
        </Button>
      </div>
    </div>
  );
}