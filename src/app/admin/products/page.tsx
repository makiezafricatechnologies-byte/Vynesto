'use client';

import { useState } from 'react';
import { useFirestore, useUser, useCollection, useMemoFirebase, useStorage } from '@/firebase';
import { collection, doc, setDoc, serverTimestamp, query, orderBy } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Plus, Trash2, Edit2, Loader2, Sparkles } from 'lucide-react';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';
import { researchProduct } from '@/ai/flows/product-research-flow';

export default function ProductsPage() {
  const { db } = useFirestore();
  const { user } = useUser();
  const storage = useStorage();
  
  const [loading, setLoading] = useState(false);
  const [aiLoading, setAiLoading] = useState(false);
  const [files, setFiles] = useState<File[]>([]);
  const [formData, setFormData] = useState({
    id: '',
    name: '',
    category: '',
    description: '',
    wasPrice: '',
    nowPrice: '',
    isFeatured: false,
    isPromotional: false,
    flashSaleDays: '7',
    discountPercentage: '',
    promoCode: '',
    imageUrls: [] as string[],
    marketingBanner: {
      headline: '',
      subheadline: '',
      tip: ''
    }
  });

  const categoriesQuery = useMemoFirebase(() => {
    if (!db) return null;
    return query(collection(db, 'categories'), orderBy('name', 'asc'));
  }, [db]);
  const { data: categories } = useCollection(categoriesQuery);

  const productsQuery = useMemoFirebase(() => {
    if (!db) return null;
    return query(collection(db, 'products'), orderBy('createdAt', 'desc'));
  }, [db]);
  const { data: products } = useCollection(productsQuery);

  async function handleResearch() {
    if (!formData.name) return;
    setAiLoading(true);
    try {
      const research = await researchProduct({ 
        productName: formData.name, 
        category: formData.category 
      });
      
      const formattedDescription = `
### Introduction
${research.introduction}

### Product & Company Profile
${research.companyInfo}

### Key Benefits
${research.benefits.map(b => `- ${b}`).join('\n')}

### SEO Keywords & Tags
${research.seoTags.join(', ')}
      `.trim();

      setFormData(prev => ({
        ...prev,
        description: formattedDescription,
        marketingBanner: {
          headline: research.marketingBanner.headline,
          subheadline: research.marketingBanner.subheadline,
          tip: research.marketingBanner.marketingTip
        }
      }));
    } catch (error) {
      console.error('AI Research Error:', error);
    } finally {
      setAiLoading(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!db || !user) return;
    setLoading(true);

    try {
      const productRef = formData.id ? doc(db, 'products', formData.id) : doc(collection(db, 'products'));
      let finalImageUrls = [...formData.imageUrls];

      if (files.length > 0) {
        const uploadPromises = files.map(async (file, index) => {
          const storageRef = ref(storage, `products/${productRef.id}/img_${index}_${Date.now()}`);
          const snapshot = await uploadBytes(storageRef, file);
          return getDownloadURL(snapshot.ref);
        });
        const newUrls = await Promise.all(uploadPromises);
        finalImageUrls = [...finalImageUrls, ...newUrls].slice(0, 4);
      }

      const productData = {
        name: formData.name,
        category: formData.category,
        description: formData.description,
        wasPrice: Number(formData.wasPrice) || 0,
        nowPrice: Number(formData.nowPrice) || 0,
        isFeatured: formData.isFeatured,
        isPromotional: formData.isPromotional,
        flashSaleDays: Number(formData.flashSaleDays) || 7,
        discountPercentage: Number(formData.discountPercentage) || 0,
        promoCode: formData.promoCode,
        marketingBanner: formData.marketingBanner,
        imageUrls: finalImageUrls,
        updatedAt: serverTimestamp(),
        createdAt: formData.id ? undefined : serverTimestamp(),
      };

      await setDoc(productRef, productData, { merge: true });
      resetForm();
    } catch (e: any) {
      errorEmitter.emit('permission-error', new FirestorePermissionError({
        path: 'products',
        operation: 'write',
        requestResourceData: formData
      }));
    } finally {
      setLoading(false);
    }
  }

  function resetForm() {
    setFormData({
      id: '', name: '', category: '', description: '', wasPrice: '', nowPrice: '',
      isFeatured: false, isPromotional: false, flashSaleDays: '7',
      discountPercentage: '', promoCode: '', imageUrls: [],
      marketingBanner: { headline: '', subheadline: '', tip: '' }
    });
    setFiles([]);
  }

  return (
    <div className="space-y-6">
      <Card className="border-2 border-primary/10 shadow-xl">
        <CardHeader className="bg-primary/5">
          <CardTitle className="text-2xl font-bold flex items-center gap-2">
            {formData.id ? <Edit2 className="w-6 h-6" /> : <Plus className="w-6 h-6" />}
            {formData.id ? 'Refine Product' : 'List New Product'}
          </CardTitle>
          <CardDescription>
            List your items with AI-optimized descriptions and high-quality image galleries.
          </CardDescription>
        </CardHeader>
        <CardContent className="p-6">
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label className="text-sm font-semibold">Product Name</Label>
                <div className="flex gap-2">
                  <Input 
                    value={formData.name} 
                    onChange={e => setFormData(p => ({...p, name: e.target.value}))} 
                    placeholder="e.g. Ajab Baking Flour" 
                    className="flex-1"
                    required 
                  />
                  <Button 
                    type="button" 
                    variant="secondary" 
                    onClick={handleResearch} 
                    disabled={aiLoading || !formData.name}
                    className="shadow-sm"
                  >
                    {aiLoading ? <Loader2 className="animate-spin" /> : <Sparkles className="w-4 h-4 mr-2" />}
                    AI Research
                  </Button>
                </div>
              </div>
              <div className="space-y-2">
                <Label className="text-sm font-semibold">Category</Label>
                <Select value={formData.category} onValueChange={v => setFormData(p => ({...p, category: v}))}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select Category" />
                  </SelectTrigger>
                  <SelectContent>
                    {categories?.map(c => (
                      <SelectItem key={c.id} value={c.name}>{c.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="space-y-2">
                <Label className="text-sm font-semibold">Original Price (Was)</Label>
                <Input type="number" value={formData.wasPrice} onChange={e => setFormData(p => ({...p, wasPrice: e.target.value}))} placeholder="250" />
              </div>
              <div className="space-y-2">
                <Label className="text-sm font-semibold">Sale Price (Now)</Label>
                <Input type="number" value={formData.nowPrice} onChange={e => setFormData(p => ({...p, nowPrice: e.target.value}))} placeholder="100" required />
              </div>
              <div className="space-y-2">
                <Label className="text-sm font-semibold">Discount %</Label>
                <Input type="number" value={formData.discountPercentage} onChange={e => setFormData(p => ({...p, discountPercentage: e.target.value}))} placeholder="15" />
              </div>
              <div className="space-y-2">
                <Label className="text-sm font-semibold">Promo Code</Label>
                <Input value={formData.promoCode} onChange={e => setFormData(p => ({...p, promoCode: e.target.value}))} placeholder="FREWSIE10" />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
               <div className="flex items-center space-x-2 p-4 border rounded-lg bg-primary/5">
                <Switch 
                  id="featured" 
                  checked={formData.isFeatured} 
                  onCheckedChange={v => setFormData(p => ({...p, isFeatured: v}))}
                />
                <Label htmlFor="featured" className="cursor-pointer font-semibold">Feature in Flash Sale</Label>
              </div>
              <div className="flex items-center space-x-2 p-4 border rounded-lg bg-accent/5">
                <Switch 
                  id="promotional" 
                  checked={formData.isPromotional} 
                  onCheckedChange={v => setFormData(p => ({...p, isPromotional: v}))}
                />
                <Label htmlFor="promotional" className="cursor-pointer font-semibold">Add to Carousel Banner</Label>
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-sm font-semibold">AI Generated Content (Intro, Profile, Benefits)</Label>
              <Textarea 
                className="h-64 font-mono text-sm leading-relaxed"
                value={formData.description} 
                onChange={e => setFormData(p => ({...p, description: e.target.value}))} 
                placeholder="Click 'AI Research' for a professional 30/50 word researched profile..."
              />
            </div>

            <div className="space-y-4 p-4 border rounded-lg bg-muted/30">
              <Label className="text-sm font-semibold">Product Gallery (Max 4 Images)</Label>
              <Input 
                type="file" 
                multiple 
                accept="image/*" 
                className="cursor-pointer"
                onChange={e => setFiles(Array.from(e.target.files || []).slice(0, 4))} 
              />
              {formData.imageUrls.length > 0 && (
                <div className="grid grid-cols-4 gap-2">
                  {formData.imageUrls.map((url, i) => (
                    <div key={i} className="relative aspect-square rounded overflow-hidden border">
                      <img src={url} alt="Product" className="object-cover w-full h-full" />
                      <button 
                        type="button"
                        onClick={() => setFormData(p => ({...p, imageUrls: p.imageUrls.filter((_, idx) => idx !== i)}))}
                        className="absolute top-1 right-1 bg-destructive p-1 rounded-full text-white shadow-lg"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="flex gap-4">
              <Button type="submit" className="flex-1 h-12 text-lg shadow-lg" disabled={loading}>
                {loading ? <Loader2 className="animate-spin mr-2" /> : <Plus className="w-5 h-5 mr-2" />}
                {formData.id ? 'Save Changes' : 'Launch Product Listing'}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {products?.map(product => (
          <Card key={product.id} className="overflow-hidden group hover:shadow-xl transition-all border-primary/5">
            <div className="aspect-video relative overflow-hidden bg-muted">
              {product.imageUrls?.[0] ? (
                <img 
                  src={product.imageUrls[0]} 
                  alt={product.name} 
                  className="object-cover w-full h-full group-hover:scale-105 transition-transform"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-muted-foreground">No image</div>
              )}
              {product.isFeatured && (
                <div className="absolute top-2 left-2 bg-primary text-primary-foreground px-2 py-1 text-xs font-bold rounded shadow-lg">
                  FLASH SALE
                </div>
              )}
            </div>
            <CardContent className="p-4">
              <div className="flex justify-between items-start mb-2">
                <h3 className="font-bold text-lg truncate flex-1">{product.name}</h3>
                <div className="flex gap-1">
                  <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setFormData({...product, id: product.id})}>
                    <Edit2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
              <div className="flex items-center gap-2 mb-4">
                <span className="text-2xl font-black text-primary">KSh {product.nowPrice}</span>
                {product.wasPrice > 0 && (
                  <span className="text-sm line-through text-muted-foreground">KSh {product.wasPrice}</span>
                )}
              </div>
              <div className="text-xs text-muted-foreground truncate italic">
                {product.category}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
