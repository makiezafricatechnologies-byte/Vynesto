'use client';

import { useState, useEffect } from 'react';
import { useFirestore, useUser, useStorage, useDoc, useMemoFirebase } from '@/firebase';
import { doc, setDoc } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Building2, Upload, CheckCircle2, Loader2, FileText } from 'lucide-react';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';

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

      if (logoFile) {
        const logoRef = ref(storage, `business/logo_${Date.now()}`);
        const snapshot = await uploadBytes(logoRef, logoFile);
        logoUrl = await getDownloadURL(snapshot.ref);
      }

      if (certFile) {
        const certRef = ref(storage, `business/cert_${Date.now()}`);
        const snapshot = await uploadBytes(certRef, certFile);
        registrationCertUrl = await getDownloadURL(snapshot.ref);
      }

      await setDoc(doc(db, 'business', 'config'), {
        logoUrl,
        registrationCertUrl,
        updatedAt: new Date().toISOString(),
        updatedBy: user.uid
      }, { merge: true });

      setLogoFile(null);
      setCertFile(null);
    } catch (e: any) {
      errorEmitter.emit('permission-error', new FirestorePermissionError({
        path: 'business/config',
        operation: 'write',
        requestResourceData: { logoFile, certFile }
      }));
    } finally {
      setSaving(true);
      setTimeout(() => setSaving(false), 2000);
    }
  }

  if (isConfigLoading) {
    return <div className="flex justify-center p-12"><Loader2 className="animate-spin" /></div>;
  }

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <div className="flex items-center gap-4 mb-8">
        <div className="p-3 bg-primary/10 rounded-xl">
          <Building2 className="w-8 h-8 text-primary" />
        </div>
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Business Hub</h1>
          <p className="text-muted-foreground">Manage your official store identity and credentials.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <Card className="border-2 hover:border-primary/20 transition-all shadow-lg">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Upload className="w-5 h-5" /> Store Logo
            </CardTitle>
            <CardDescription>Upload your high-resolution brand logo.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="aspect-square rounded-2xl border-2 border-dashed flex flex-col items-center justify-center bg-muted/30 relative overflow-hidden">
              {logoFile ? (
                <img src={URL.createObjectURL(logoFile)} className="object-contain w-full h-full p-4" />
              ) : businessConfig?.logoUrl ? (
                <img src={businessConfig.logoUrl} className="object-contain w-full h-full p-4" />
              ) : (
                <div className="text-center p-6">
                  <Building2 className="w-12 h-12 text-muted-foreground mx-auto mb-2" />
                  <p className="text-xs text-muted-foreground">No Logo Uploaded</p>
                </div>
              )}
            </div>
            <Input 
              type="file" 
              accept="image/*" 
              onChange={e => setLogoFile(e.target.files?.[0] || null)}
              className="cursor-pointer"
            />
          </CardContent>
        </Card>

        <Card className="border-2 hover:border-primary/20 transition-all shadow-lg">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="w-5 h-5" /> Registration Certificate
            </CardTitle>
            <CardDescription>Upload your official business certificate.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="aspect-square rounded-2xl border-2 border-dashed flex flex-col items-center justify-center bg-muted/30">
              {certFile ? (
                <div className="text-center p-6">
                  <CheckCircle2 className="w-12 h-12 text-green-500 mx-auto mb-2" />
                  <p className="text-sm font-medium">{certFile.name}</p>
                </div>
              ) : businessConfig?.registrationCertUrl ? (
                <div className="text-center p-6">
                  <CheckCircle2 className="w-12 h-12 text-primary mx-auto mb-2" />
                  <p className="text-sm font-medium">Certificate Stored</p>
                  <a href={businessConfig.registrationCertUrl} target="_blank" className="text-xs text-primary underline mt-2 block">View Document</a>
                </div>
              ) : (
                <div className="text-center p-6">
                  <FileText className="w-12 h-12 text-muted-foreground mx-auto mb-2" />
                  <p className="text-xs text-muted-foreground">No Certificate Uploaded</p>
                </div>
              )}
            </div>
            <Input 
              type="file" 
              accept=".pdf,image/*" 
              onChange={e => setCertFile(e.target.files?.[0] || null)}
              className="cursor-pointer"
            />
          </CardContent>
        </Card>
      </div>

      <div className="flex justify-end">
        <Button 
          size="lg" 
          onClick={handleSave} 
          disabled={saving || (!logoFile && !certFile)}
          className="px-12 h-14 text-lg font-bold shadow-xl"
        >
          {saving ? <Loader2 className="animate-spin mr-2" /> : <CheckCircle2 className="w-5 h-5 mr-2" />}
          {saving ? 'Synchronizing...' : 'Save Credentials'}
        </Button>
      </div>
    </div>
  );
}
