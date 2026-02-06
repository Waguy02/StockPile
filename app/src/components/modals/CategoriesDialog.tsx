import React, { useState } from 'react';
import { Loader2, Plus } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useStore } from '../../lib/StoreContext';
import { api } from '../../lib/api';
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";

interface CategoriesDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CategoriesDialog({ open, onOpenChange }: CategoriesDialogProps) {
  const { categories, refresh } = useStore();
  const [isCreating, setIsCreating] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState("");
  const [newCategoryDesc, setNewCategoryDesc] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCategoryName) return;

    setIsLoading(true);
    try {
      await api.createCategory({
        name: newCategoryName,
        description: newCategoryDesc,
        status: 'active'
      });
      await refresh();
      setNewCategoryName("");
      setNewCategoryDesc("");
      setIsCreating(false);
    } catch (error) {
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Manage Categories</DialogTitle>
          <DialogDescription>
            View and manage product categories here.
          </DialogDescription>
        </DialogHeader>

        <div className="py-4">
            <div className="flex justify-between items-center mb-4">
                 <h3 className="text-sm font-medium">Existing Categories</h3>
                 {!isCreating && (
                     <Button size="sm" variant="outline" onClick={() => setIsCreating(true)}>
                         <Plus className="w-4 h-4 mr-2" />
                         Add New
                     </Button>
                 )}
            </div>
            
            {isCreating && (
                <form onSubmit={handleCreate} className="mb-4 p-4 border rounded-lg bg-slate-50 space-y-3">
                    <div className="space-y-1">
                        <label className="text-xs font-medium">Name</label>
                        <Input 
                            value={newCategoryName} 
                            onChange={(e) => setNewCategoryName(e.target.value)}
                            placeholder="e.g. Electronics"
                            autoFocus
                        />
                    </div>
                    <div className="space-y-1">
                        <label className="text-xs font-medium">Description</label>
                        <Input 
                            value={newCategoryDesc} 
                            onChange={(e) => setNewCategoryDesc(e.target.value)}
                            placeholder="Optional description"
                        />
                    </div>
                    <div className="flex justify-end gap-2 mt-2">
                        <Button type="button" variant="ghost" size="sm" onClick={() => setIsCreating(false)}>Cancel</Button>
                        <Button type="submit" size="sm" disabled={isLoading}>
                            {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Save"}
                        </Button>
                    </div>
                </form>
            )}

            <ScrollArea className="h-[300px] w-full rounded-md border p-4">
                <div className="space-y-4">
                    {categories.length === 0 ? (
                        <p className="text-sm text-center text-muted-foreground py-8">No categories found.</p>
                    ) : (
                        categories.map((cat) => (
                            <div key={cat.id} className="flex items-center justify-between group p-2 hover:bg-slate-50 rounded-lg transition-colors">
                                <div>
                                    <p className="font-medium text-sm">{cat.name}</p>
                                    {cat.description && <p className="text-xs text-muted-foreground">{cat.description}</p>}
                                </div>
                                <Badge variant={cat.status === 'active' ? 'default' : 'secondary'} className="text-[10px]">
                                    {cat.status}
                                </Badge>
                            </div>
                        ))
                    )}
                </div>
            </ScrollArea>
        </div>
      </DialogContent>
    </Dialog>
  );
}
