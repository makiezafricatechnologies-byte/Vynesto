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
import { Plus, Trash2, Edit2, Loader2, Sparkles, AlertCircle } from 'lucide-react';
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
    }, 3500);
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
          className={`absolute inset-0 transition-all duration-1000 ease-in-out ${
            idx === currentIndex ? 'opacity-100 scale-100' : 'opacity-0 scale-105'
          }`}
        >
          <img src={url} alt={`Slide ${idx}`} className="object-cover w-full h-full" />
        </div>
      ))}
      <div className="absolute bottom-3 left-0 right-0 flex justify-center gap-1.5 z-10">
        {images.map((_, idx) => (
          <div 
            key={idx} 
            className={`h-1.5 rounded-full transition-all duration-500 ${idx === currentIndex ? 'bg-white w-5' : 'bg-white/40 w-1.5'}`} 
          />
        ))}
      </div>
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
      
      const formattedDescription = `### Introduction\n${research.introduction}\n\n### Brand & Company Profile\n${research.companyInfo}\n\n### Key Benefits\n${research.benefits.map(b => `- ${b}`).join('\n')}\n\n### SEO Tags\n${research.seoTags.join(', ')}`;

      setFormData(prev => ({
        ...prev,
        description: formattedDescription,
        marketingBanner: {
          headline: research.marketingBanner.headline,
          subheadline: research.marketingBanner.subheadline,
          tip: research.marketingBanner.marketingTip
        }
      }));
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
        // Upload images in parallel for speed
        const uploadPromises = files.map(async (file, index) => {
          const storageRef = ref(storage, `products/${productRef.id}/img_${Date.now()}_${index}`);
          const snapshot = await uploadBytes(storageRef, file);
          return getDownloadURL(snapshot.ref);
        });
        const newUrls = await Promise.all(uploadPromises);
        finalImageUrls = [...finalImageUrls, ...newUrls].slice(0, 4);
      }

      const productData: any = {
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
      };

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
      discountPercentage: '', promoCode: '', imageUrls: [],
      marketingBanner: { headline: '', subheadline: '', tip: '' }
    });
    setFiles([]);
  }

  function handleDeleteProduct(productId: string) {
    if (!db || !window.confirm('Delete this product permanently?')) return;
    deleteDocumentNonBlocking(doc(db, 'products', productId));
  }

  return (
    <div className="max-w-7xl mx-auto space-y-10">
      <Card className="border-2 border-primary/10 shadow-2xl overflow-hidden">
        <CardHeader className="bg-primary/5 pb-8">
          <CardTitle className="text-3xl font-black flex items-center gap-3 text-primary">
            {formData.id ? <Edit2 className="w-8 h-8" /> : <Plus className="w-8 h-8" />}
            {formData.id ? 'Edit Product Catalog' : 'Launch New Product'}
          </CardTitle>
          <CardDescription className="text-base">
            List your items with AI-researched descriptions and high-speed image galleries.
          </CardDescription>
        </CardHeader>
        <CardContent className="p-8">
          <form onSubmit={handleSubmit} className="space-y-8">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="space-y-3">
                <Label className="text-sm font-bold uppercase tracking-wider text-muted-foreground">Product Identification</Label>
                <div className="flex gap-2">
                  <Input 
                    value={formData.name} 
                    onChange={e => setFormData(p => ({...p, name: e.target.value}))} 
                    placeholder="e.g. Ajab Baking Flour" 
                    className="h-12 text-lg"
                    required 
                  />
                  <Button 
                    type="button" 
                    variant="secondary" 
                    onClick={handleResearch} 
                    disabled={aiLoading || !formData.name}
                    className="h-12 px-6 shadow-md hover:bg-primary hover:text-white transition-colors"
                  >
                    {aiLoading ? <Loader2 className="animate-spin" /> : <Sparkles className="w-4 h-4 mr-2" />}
                    AI Research
                  </Button>
                </div>
              </div>
              <div className="space-y-3">
                <Label className="text-sm font-bold uppercase tracking-wider text-muted-foreground">Category Taxonomy</Label>
                <Select value={formData.category} onValueChange={v => setFormData(p => ({...p, category: v}))}>
                  <SelectTrigger className="h-12">
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

            <div className="grid grid-cols-2 md:grid-cols-4 gap-6 p-6 bg-muted/20 rounded-2xl border">
              <div className="space-y-2">
                <Label className="text-xs font-bold text-muted-foreground">Was (Price)</Label>
                <Input type="number" value={formData.wasPrice} onChange={e => setFormData(p => ({...p, wasPrice: e.target.value}))} placeholder="250" className="font-mono" />
              </div>
              <div className="space-y-2">
                <Label className="text-xs font-bold text-primary">Now (Sale)</Label>
                <Input type="number" value={formData.nowPrice} onChange={e => setFormData(p => ({...p, nowPrice: e.target.value}))} placeholder="100" className="font-mono border-primary/50" required />
              </div>
              <div className="space-y-2">
                <Label className="text-xs font-bold text-muted-foreground">Discount %</Label>
                <Input type="number" value={formData.discountPercentage} onChange={e => setFormData(p => ({...p, discountPercentage: e.target.value}))} placeholder="15" className="font-mono" />
              </div>
              <div className="space-y-2">
                <Label className="text-xs font-bold text-muted-foreground">Promo Code</Label>
                <Input value={formData.promoCode} onChange={e => setFormData(p => ({...p, promoCode: e.target.value}))} placeholder="FREWSIE10" className="font-mono" />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
               <div className="flex items-center space-x-3 p-5 border-2 rounded-2xl bg-primary/5 hover:border-primary/40 transition-colors cursor-pointer" onClick={() => setFormData(p => ({...p, isFeatured: !p.isFeatured}))}>
                <Switch checked={formData.isFeatured} onCheckedChange={v => setFormData(p => ({...p, isFeatured: v}))} />
                <div>
                  <Label className="font-bold block">Flash Sale Feature</Label>
                  <p className="text-xs text-muted-foreground">Highlights product in the urgent deals section.</p>
                </div>
              </div>
              <div className="flex items-center space-x-3 p-5 border-2 rounded-2xl bg-accent/5 hover:border-accent/40 transition-colors cursor-pointer" onClick={() => setFormData(p => ({...p, isPromotional: !p.isPromotional}))}>
                <Switch checked={formData.isPromotional} onCheckedChange={v => setFormData(p => ({...p, isPromotional: v}))} />
                <div>
                  <Label className="font-bold block">Carousel Banner</Label>
                  <p className="text-xs text-muted-foreground">Adds an attractive banner to the homepage hero.</p>
                </div>
              </div>
            </div>

            <div className="space-y-3">
              <Label className="text-sm font-bold uppercase tracking-wider text-muted-foreground">AI Research Description</Label>
              <Textarea 
                className="h-80 font-mono text-sm leading-relaxed p-6 bg-muted/30 focus:bg-background transition-colors"
                value={formData.description} 
                onChange={e => setFormData(p => ({...p, description: e.target.value}))} 
                placeholder="Click 'AI Research' for a professional 30/50 word structured profile..."
              />
            </div>

            <div className="space-y-4 p-6 border-2 border-dashed rounded-2xl bg-muted/10">
              <div className="flex justify-between items-center">
                <Label className="text-sm font-bold uppercase tracking-wider text-muted-foreground">Gallery Upload (Parallel Sync)</Label>
                <span className="text-xs font-bold text-primary">{formData.imageUrls.length + files.length} / 4 Images</span>
              </div>
              <Input 
                type="file" 
                multiple 
                accept="image/*" 
                className="cursor-pointer file:bg-primary file:text-white file:border-0 file:rounded-md file:px-4 file:py-1 file:mr-4 h-12 flex items-center"
                onChange={e => setFiles(Array.from(e.target.files || []).slice(0, 4 - formData.imageUrls.length))} 
              />
              {(formData.imageUrls.length > 0 || files.length > 0) && (
                <div className="grid grid-cols-4 gap-4 pt-4">
                  {formData.imageUrls.map((url, i) => (
                    <div key={i} className="relative aspect-square rounded-xl overflow-hidden border-2 group">
                      <img src={url} alt="Product" className="object-cover w-full h-full" />
                      <button 
                        type="button"
                        onClick={() => setFormData(p => ({...p, imageUrls: p.imageUrls.filter((_, idx) => idx !== i)}))}
                        className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <Trash2 className="w-6 h-6 text-white" />
                      </button>
                    </div>
                  ))}
                  {files.map((file, i) => (
                    <div key={i} className="relative aspect-square rounded-xl overflow-hidden border-2 bg-muted/50 flex flex-col items-center justify-center border-dashed">
                      <Loader2 className="w-6 h-6 animate-spin text-muted-foreground opacity-50 mb-2" />
                      <span className="text-[10px] text-center px-2 truncate w-full font-bold">{file.name}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="flex gap-4 pt-6">
              <Button type="submit" className="flex-1 h-16 text-xl font-black shadow-2xl transition-all hover:scale-[1.02] active:scale-95" disabled={loading}>
                {loading ? <Loader2 className="animate-spin mr-3 w-6 h-6" /> : <Plus className="w-6 h-6 mr-3" />}
                {formData.id ? 'Save Catalog Update' : 'Publish Product to Live Store'}
              </Button>
              {formData.id && (
                <Button type="button" variant="outline" className="h-16 px-8 text-lg font-bold" onClick={resetForm}>
                  Cancel
                </Button>
              )}
            </div>
          </form>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 pb-12">
        {products?.map(product => (
          <Card key={product.id} className="overflow-hidden group hover:shadow-2xl transition-all border-2 border-transparent hover:border-primary/20">
            <div className="aspect-video relative overflow-hidden bg-muted">
              <ProductImageSlider images={product.imageUrls || []} />
              <div className="absolute top-3 left-3 flex flex-col gap-2 z-20">
                {product.isFeatured && (
                  <div className="bg-primary text-primary-foreground px-3 py-1.5 text-[10px] font-black rounded-lg shadow-xl tracking-widest uppercase">
                    Flash Sale
                  </div>
                )}
                {product.isPromotional && (
                  <div className="bg-accent text-accent-foreground px-3 py-1.5 text-[10px] font-black rounded-lg shadow-xl tracking-widest uppercase border">
                    Promotional
                  </div>
                )}
              </div>
            </div>
            <CardContent className="p-6">
              <div className="flex justify-between items-start mb-3">
                <div className="flex-1 min-w-0">
                  <h3 className="font-black text-xl truncate pr-2">{product.name}</h3>
                  <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">{product.category}</p>
                </div>
                <div className="flex gap-1 shrink-0">
                  <Button variant="outline" size="icon" className="h-9 w-9 hover:bg-primary hover:text-white" onClick={() => setFormData({...product, id: product.id})}>
                    <Edit2 className="h-4 w-4" />
                  </Button>
                  <Button variant="outline" size="icon" className="h-9 w-9 text-destructive hover:bg-destructive hover:text-white" onClick={() => handleDeleteProduct(product.id)}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
              <div className="flex items-center gap-3 mt-4 pt-4 border-t">
                <span className="text-3xl font-black text-primary">KSh {product.nowPrice}</span>
                {product.wasPrice > 0 && (
                  <span className="text-sm line-through text-muted-foreground font-bold">KSh {product.wasPrice}</span>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}