
'use client';

import { useState, useEffect } from 'react';
import { useFirestore, useUser, useCollection, useMemoFirebase, useStorage } from '@/firebase';
import { collection, doc, serverTimestamp, query, orderBy } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Plus, Trash2, Edit2, Loader2, Sparkles, AlertCircle, ShoppingBag } from 'lucide-react';
import { researchProduct } from '@/ai/flows/product-research-flow';
import { setDocumentNonBlocking, deleteDocumentNonBlocking } from '@/firebase/non-blocking-updates';

/**
 * Endless Sliding Image Component for Product Cards
 */
function ProductImageSlider({ images }: { images: string[] }) {
  const [currentIndex, setCurrentIndex] = useState(0);

  useEffect(() => {
    if (!images || images.length <= 1) return;
    const interval = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % images.length);
    }, 4000);
    return () => clearInterval(interval);
  }, [images]);

  if (!images || images.length === 0) {
    return (
      <div className="w-full h-full flex items-center justify-center bg-muted text-muted-foreground">
        <AlertCircle className="w-8 h-8 opacity-20" />
      </div>
    );
  }

  return (
    <div className="relative w-full h-full group">
      {images.map((url, idx) => (
        <div
          key={url}
          className={`absolute inset-0 transition-opacity duration-1000 ${
            idx === currentIndex ? 'opacity-100' : 'opacity-0'
          }`}
        >
          <img src={url} alt={`Slide ${idx}`} className="object-cover w-full h-full" />
        </div>
      ))}
    </div>
  );
}

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
    imageUrls: [] as string[]
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
      
      const formattedDescription = `### Introduction\n${research.introduction}\n\n### Brand & Company Profile\n${research.companyInfo}\n\n### Key Benefits\n${research.benefits.map(b => `- ${b}`).join('\n')}\n\n### SEO Tags\n${research.seoTags.join(', ')}`;

      setFormData(prev => ({ ...prev, description: formattedDescription }));
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
        // Parallel sync upload for 4 images
        const uploadPromises = files.map(async (file, index) => {
          const storageRef = ref(storage, `products/${productRef.id}/img_${Date.now()}_${index}`);
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
        imageUrls: finalImageUrls,
        updatedAt: serverTimestamp(),
      } as any;

      if (!formData.id) {
        productData.createdAt = serverTimestamp();
      }

      setDocumentNonBlocking(productRef, productData, { merge: true });
      resetForm();
    } finally {
      setLoading(false);
    }
  }

  function resetForm() {
    setFormData({
      id: '', name: '', category: '', description: '', wasPrice: '', nowPrice: '',
      isFeatured: false, isPromotional: false, flashSaleDays: '7',
      discountPercentage: '', promoCode: '', imageUrls: []
    });
    setFiles([]);
  }

  return (
    <div className="space-y-10">
      <div className="flex items-center gap-4">
        <div className="p-4 bg-primary/10 rounded-2xl">
          <ShoppingBag className="w-8 h-8 text-primary" />
        </div>
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Product Catalog</h1>
          <p className="text-muted-foreground">List items with AI research and parallel image sync.</p>
        </div>
      </div>

      <Card className="border-2 shadow-xl">
        <CardContent className="p-8">
          <form onSubmit={handleSubmit} className="space-y-8">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="space-y-2">
                <Label>Product Name</Label>
                <div className="flex gap-2">
                  <Input 
                    value={formData.name} 
                    onChange={e => setFormData(p => ({...p, name: e.target.value}))} 
                    placeholder="e.g. Ajab Baking Flour" 
                    required 
                  />
                  <Button 
                    type="button" 
                    variant="secondary" 
                    onClick={handleResearch} 
                    disabled={aiLoading || !formData.name}
                  >
                    {aiLoading ? <Loader2 className="animate-spin" /> : <Sparkles className="w-4 h-4 mr-2" />}
                    AI Research
                  </Button>
                </div>
              </div>
              <div className="space-y-2">
                <Label>Category</Label>
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

            <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
              <div className="space-y-2">
                <Label>Was Price</Label>
                <Input type="number" value={formData.wasPrice} onChange={e => setFormData(p => ({...p, wasPrice: e.target.value}))} placeholder="250" />
              </div>
              <div className="space-y-2">
                <Label>Now Price</Label>
                <Input type="number" value={formData.nowPrice} onChange={e => setFormData(p => ({...p, nowPrice: e.target.value}))} placeholder="100" required />
              </div>
              <div className="space-y-2">
                <Label>Discount %</Label>
                <Input type="number" value={formData.discountPercentage} onChange={e => setFormData(p => ({...p, discountPercentage: e.target.value}))} placeholder="15" />
              </div>
              <div className="space-y-2">
                <Label>Promo Code</Label>
                <Input value={formData.promoCode} onChange={e => setFormData(p => ({...p, promoCode: e.target.value}))} placeholder="FREWSIE10" />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
               <div className="flex items-center space-x-3 p-4 border rounded-xl bg-muted/30">
                <Switch checked={formData.isFeatured} onCheckedChange={v => setFormData(p => ({...p, isFeatured: v}))} />
                <Label>Flash Sale Feature</Label>
              </div>
              <div className="flex items-center space-x-3 p-4 border rounded-xl bg-muted/30">
                <Switch checked={formData.isPromotional} onCheckedChange={v => setFormData(p => ({...p, isPromotional: v}))} />
                <Label>Carousel Banner</Label>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Description (AI Enhanced)</Label>
              <Textarea 
                className="h-64 font-mono text-sm"
                value={formData.description} 
                onChange={e => setFormData(p => ({...p, description: e.target.value}))} 
                placeholder="Click 'AI Research' for a professional 30/50 word profile..."
              />
            </div>

            <div className="space-y-4">
              <Label>Gallery Upload (Max 4)</Label>
              <Input 
                type="file" 
                multiple 
                accept="image/*" 
                onChange={e => setFiles(Array.from(e.target.files || []).slice(0, 4))} 
              />
              <div className="grid grid-cols-4 gap-4">
                {formData.imageUrls.map((url, i) => (
                  <div key={i} className="aspect-square rounded-lg overflow-hidden border relative group">
                    <img src={url} alt="Product" className="object-cover w-full h-full" />
                    <button 
                      type="button"
                      onClick={() => setFormData(p => ({...p, imageUrls: p.imageUrls.filter((_, idx) => idx !== i)}))}
                      className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <Trash2 className="w-5 h-5 text-white" />
                    </button>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex gap-4">
              <Button type="submit" className="flex-1 h-12 text-lg" disabled={loading}>
                {loading && <Loader2 className="animate-spin mr-2" />}
                {formData.id ? 'Update Product' : 'List Product'}
              </Button>
              {formData.id && (
                <Button type="button" variant="outline" onClick={resetForm}>Cancel</Button>
              )}
            </div>
          </form>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8 pb-12">
        {products?.map(product => (
          <Card key={product.id} className="overflow-hidden group hover:shadow-lg transition-shadow">
            <div className="aspect-video relative overflow-hidden bg-muted">
              <ProductImageSlider images={product.imageUrls || []} />
            </div>
            <CardContent className="p-4">
              <div className="flex justify-between items-start mb-2">
                <div>
                  <h3 className="font-bold text-lg">{product.name}</h3>
                  <p className="text-xs text-muted-foreground uppercase">{product.category}</p>
                </div>
                <div className="flex gap-1">
                  <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setFormData({...product, id: product.id})}>
                    <Edit2 className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => deleteDocumentNonBlocking(doc(db, 'products', product.id))}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
              <div className="flex items-center gap-2 mt-2">
                <span className="text-xl font-bold text-primary">KSh {product.nowPrice}</span>
                {product.wasPrice > 0 && (
                  <span className="text-xs line-through text-muted-foreground">KSh {product.wasPrice}</span>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
