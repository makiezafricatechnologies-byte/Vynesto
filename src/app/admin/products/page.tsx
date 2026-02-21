'use client';

import { useState } from 'react';
import { useFirestore, useUser, useCollection } from '@/firebase';
import { collection, doc, setDoc, deleteDoc, serverTimestamp, query, orderBy } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL, getStorage } from 'firebase/storage';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Plus, Trash2, Edit2, Loader2, Sparkles, ImagePlus } from 'lucide-react';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';
import { researchProduct } from '@/ai/flows/product-research-flow';

export default function ProductsPage() {
  const { db } = useFirestore();
  const { user } = useUser();
  const storage = getStorage();
  
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

  const categoriesQuery = query(collection(db!, 'categories'), orderBy('name', 'asc'));
  const { data: categories } = useCollection(categoriesQuery);
  const productsQuery = query(collection(db!, 'products'), orderBy('createdAt', 'desc'));
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

### About the Manufacturer
${research.companyInfo}

### Key Benefits
${research.benefits.map(b => `- ${b}`).join('\n')}

### SEO Keywords
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
        // Parallel Upload for efficiency
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
    <div className="space-y-6 max-w-5xl mx-auto p-4">
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
                <Label className="text-sm">Original (Was)</Label>
                <Input type="number" value={formData.wasPrice} onChange={e => setFormData(p => ({...p, wasPrice: e.target.value}))} placeholder="250" />
              </div>
              <div className="space-y-2">
                <Label className="text-sm">Current (Now)</Label>
                <Input type="number" value={formData.nowPrice} onChange={e => setFormData(p => ({...p, nowPrice: e.target.value}))} placeholder="100" required />
              </div>
              <div className="space-y-2">
                <Label className="text-sm">Discount %</Label>
                <Input type="number" value={formData.discountPercentage} onChange={e => setFormData(p => ({...p, discountPercentage: e.target.value}))} placeholder="15" />
              </div>
              <div className="space-y-2">
                <Label className="text-sm">Promo Code</Label>
                <Input value={formData.promoCode} onChange={e => setFormData(p => ({...p, promoCode: e.target.value}))} placeholder="FREWSIE10" />
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-sm font-semibold">Description (Research-Based AI Content)</Label>
              <Textarea 
                className="h-64 font-mono text-sm leading-relaxed"
                value={formData.description} 
                onChange={e => setFormData(p => ({...p, description: e.target.value}))} 
                placeholder="Click 'AI Research' for an elite, SEO-optimized product description..."
              />
              <p className="text-[10px] text-muted-foreground uppercase tracking-widest">Supports Markdown Formatting</p>
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

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 p-4 border rounded-lg bg-primary/5">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label className="text-base">Flash Sale</Label>
                  <p className="text-xs text-muted-foreground">Feature this product in the flash deals section</p>
                </div>
                <Switch checked={formData.isFeatured} onCheckedChange={v => setFormData(p => ({...p, isFeatured: v}))} />
              </div>
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label className="text-base">Carousel Banner</Label>
                  <p className="text-xs text-muted-foreground">Display this as a hero promotional banner</p>
                </div>
                <Switch checked={formData.isPromotional} onCheckedChange={v => setFormData(p => ({...p, isPromotional: v}))} />
              </div>
            </div>

            {formData.isPromotional && (
              <Card className="border-dashed border-2">
                <CardHeader>
                  <CardTitle className="text-sm uppercase tracking-tighter">AI Banner Designer</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <Input 
                    value={formData.marketingBanner.headline} 
                    onChange={e => setFormData(p => ({...p, marketingBanner: {...p.marketingBanner, headline: e.target.value}}))} 
                    placeholder="Headline" 
                  />
                  <Input 
                    value={formData.marketingBanner.subheadline} 
                    onChange={e => setFormData(p => ({...p, marketingBanner: {...p.marketingBanner, subheadline: e.target.value}}))} 
                    placeholder="Subheadline" 
                  />
                  <Textarea 
                    value={formData.marketingBanner.tip} 
                    onChange={e => setFormData(p => ({...p, marketingBanner: {...p.marketingBanner, tip: e.target.value}}))} 
                    placeholder="Exclusive Marketing Tip/Hook" 
                  />
                </CardContent>
              </Card>
            )}

            <div className="flex gap-4">
              <Button type="submit" className="flex-1 h-12 text-lg shadow-lg" disabled={loading}>
                {loading ? <Loader2 className="animate-spin mr-2" /> : <Plus className="w-5 h-5 mr-2" />}
                {formData.id ? 'Save Changes' : 'Launch Product Listing'}
              </Button>
              {formData.id && (
                <Button type="button" variant="outline" className="h-12" onClick={resetForm}>
                  Cancel
                </Button>
              )}
            </div>
          </form>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 pt-10 border-t">
        {products?.map(product => (
          <Card key={product.id} className="overflow-hidden group hover:shadow-2xl transition-all border-none bg-card shadow-md">
            <div className="relative h-56 bg-muted">
              {product.imageUrls?.[0] ? (
                <img src={product.imageUrls[0]} alt={product.name} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" />
              ) : (
                <div className="flex items-center justify-center h-full"><ImagePlus className="text-muted-foreground w-12 h-12" /></div>
              )}
              <div className="absolute top-3 left-3 flex gap-2">
                {product.isFeatured && <span className="bg-yellow-400 text-black font-bold px-3 py-1 text-[10px] rounded-full shadow-lg uppercase">Flash</span>}
                {product.isPromotional && <span className="bg-primary text-primary-foreground font-bold px-3 py-1 text-[10px] rounded-full shadow-lg uppercase">Promo</span>}
              </div>
            </div>
            <CardContent className="p-5">
              <div className="flex justify-between items-start mb-4">
                <div className="flex-1">
                  <h3 className="font-black text-lg truncate uppercase">{product.name}</h3>
                  <p className="text-xs font-medium text-muted-foreground">{product.category}</p>
                </div>
                <div className="text-right">
                  <p className="font-black text-xl text-primary">Ksh {product.nowPrice}</p>
                  {product.wasPrice > 0 && <p className="text-xs line-through text-muted-foreground">Ksh {product.wasPrice}</p>}
                </div>
              </div>
              <div className="flex gap-3 pt-4 border-t">
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="flex-1 rounded-full" 
                  onClick={() => {
                    setFormData({
                      id: product.id,
                      name: product.name,
                      category: product.category,
                      description: product.description,
                      wasPrice: product.wasPrice.toString(),
                      nowPrice: product.nowPrice.toString(),
                      isFeatured: product.isFeatured,
                      isPromotional: product.isPromotional,
                      flashSaleDays: product.flashSaleDays?.toString() || '7',
                      discountPercentage: product.discountPercentage?.toString() || '0',
                      promoCode: product.promoCode || '',
                      imageUrls: product.imageUrls || [],
                      marketingBanner: product.marketingBanner || { headline: '', subheadline: '', tip: '' }
                    });
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                  }}
                >
                  <Edit2 className="w-4 h-4 mr-2" /> Edit
                </Button>
                <Button 
                  variant="destructive" 
                  size="sm" 
                  className="rounded-full w-10 h-10 p-0"
                  onClick={() => {
                    if(confirm('Are you sure you want to delete this product?')) {
                      deleteDoc(doc(db!, 'products', product.id));
                    }
                  }}
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}