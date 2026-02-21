'use client';

import { useState } from 'react';
import { useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { collection, doc, setDoc, query, orderBy, serverTimestamp } from 'firebase/firestore';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tags, Plus, Loader2, Sparkles, Trash2 } from 'lucide-react';

const SEED_CATEGORIES = [
  { name: 'Supermarket', image: 'https://picsum.photos/seed/sm/600/400' },
  { name: 'Groceries', image: 'https://picsum.photos/seed/gr/600/400' },
  { name: 'Electronics', image: 'https://picsum.photos/seed/el/600/400' },
  { name: 'Beauty & Personal Care', image: 'https://picsum.photos/seed/bt/600/400' },
  { name: 'Home & Kitchen', image: 'https://picsum.photos/seed/hk/600/400' },
  { name: 'Fashion', image: 'https://picsum.photos/seed/fs/600/400' },
  { name: 'Computing', image: 'https://picsum.photos/seed/cp/600/400' },
  { name: 'Stationery', image: 'https://picsum.photos/seed/st/600/400' },
];

export default function CategoriesPage() {
  const { db } = useFirestore();
  const [loading, setLoading] = useState(false);
  const [newName, setNewName] = useState('');

  const categoriesQuery = useMemoFirebase(() => {
    if (!db) return null;
    return query(collection(db, 'categories'), orderBy('name', 'asc'));
  }, [db]);
  const { data: categories } = useCollection(categoriesQuery);

  async function handleAddCategory(e: React.FormEvent) {
    e.preventDefault();
    if (!db || !newName) return;
    setLoading(true);
    const id = newName.toLowerCase().replace(/\s+/g, '-');
    await setDoc(doc(db, 'categories', id), {
      name: newName,
      image: `https://picsum.photos/seed/${id}/600/400`,
      createdAt: serverTimestamp()
    });
    setNewName('');
    setLoading(false);
  }

  async function seedCategories() {
    if (!db) return;
    setLoading(true);
    for (const cat of SEED_CATEGORIES) {
      const id = cat.name.toLowerCase().replace(/\s+/g, '-');
      await setDoc(doc(db, 'categories', id), {
        ...cat,
        createdAt: serverTimestamp()
      });
    }
    setLoading(false);
  }

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="p-3 bg-primary/10 rounded-xl">
            <Tags className="w-8 h-8 text-primary" />
          </div>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Category Manager</h1>
            <p className="text-muted-foreground">Define your store's structural taxonomy.</p>
          </div>
        </div>
        <Button variant="outline" onClick={seedCategories} disabled={loading}>
          <Sparkles className="w-4 h-4 mr-2" />
          Seed Industry Standards
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        <Card className="md:col-span-1 h-fit">
          <CardHeader>
            <CardTitle>Add Category</CardTitle>
            <CardDescription>Create a new inventory segment.</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleAddCategory} className="space-y-4">
              <div className="space-y-2">
                <Label>Category Name</Label>
                <Input 
                  value={newName} 
                  onChange={e => setNewName(e.target.value)} 
                  placeholder="e.g. Dairy Products" 
                />
              </div>
              <Button type="submit" className="w-full" disabled={loading || !newName}>
                {loading ? <Loader2 className="animate-spin mr-2" /> : <Plus className="w-4 h-4 mr-2" />}
                Register Category
              </Button>
            </form>
          </CardContent>
        </Card>

        <div className="md:col-span-2 grid grid-cols-1 sm:grid-cols-2 gap-4">
          {categories?.map(cat => (
            <Card key={cat.id} className="overflow-hidden border-2 hover:border-primary/20 transition-all">
              <div className="aspect-video relative">
                <img src={cat.image} className="object-cover w-full h-full" alt={cat.name} />
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent flex items-end p-4">
                  <h3 className="text-white font-bold text-lg">{cat.name}</h3>
                </div>
              </div>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}