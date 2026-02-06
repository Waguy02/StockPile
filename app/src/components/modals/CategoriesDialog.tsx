import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
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
  const { t } = useTranslation();
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
      <DialogContent className="sm:max-w-[500px] bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800">
        <DialogHeader>
          <DialogTitle className="text-slate-900 dark:text-slate-100">{t('modals.categories.title')}</DialogTitle>
          <DialogDescription className="text-slate-500 dark:text-slate-400">
            {t('modals.categories.desc')}
          </DialogDescription>
        </DialogHeader>

        <div className="py-4">
            <div className="flex justify-between items-center mb-4">
                 <h3 className="text-sm font-medium text-slate-900 dark:text-slate-100">{t('modals.categories.existing')}</h3>
                 {!isCreating && (
                     <Button size="sm" variant="outline" onClick={() => setIsCreating(true)} className="border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300">
                         <Plus className="w-4 h-4 mr-2" />
                         {t('modals.categories.addNew')}
                     </Button>
                 )}
            </div>
            
            {isCreating && (
                <form onSubmit={handleCreate} className="mb-4 p-4 border rounded-lg bg-slate-50 dark:bg-slate-800/50 border-slate-200 dark:border-slate-700 space-y-3">
                    <div className="space-y-1">
                        <label className="text-xs font-medium text-slate-900 dark:text-slate-200">{t('modals.categories.nameLabel')}</label>
                        <Input 
                            value={newCategoryName} 
                            onChange={(e) => setNewCategoryName(e.target.value)}
                            placeholder={t('modals.categories.namePlaceholder')}
                            autoFocus
                            className="bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-800 text-slate-900 dark:text-slate-100 placeholder:text-slate-500 dark:placeholder:text-slate-400"
                        />
                    </div>
                    <div className="space-y-1">
                        <label className="text-xs font-medium text-slate-900 dark:text-slate-200">{t('modals.categories.descLabel')}</label>
                        <Input 
                            value={newCategoryDesc} 
                            onChange={(e) => setNewCategoryDesc(e.target.value)}
                            placeholder={t('modals.categories.descPlaceholder')}
                            className="bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-800 text-slate-900 dark:text-slate-100 placeholder:text-slate-500 dark:placeholder:text-slate-400"
                        />
                    </div>
                    <div className="flex justify-end gap-2 mt-2">
                        <Button type="button" variant="ghost" size="sm" onClick={() => setIsCreating(false)} className="text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-800">{t('modals.categories.cancel')}</Button>
                        <Button type="submit" size="sm" disabled={isLoading} className="bg-indigo-600 hover:bg-indigo-700 text-white dark:bg-indigo-600 dark:hover:bg-indigo-700">
                            {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : t('modals.categories.save')}
                        </Button>
                    </div>
                </form>
            )}

            <ScrollArea className="h-[300px] w-full rounded-md border border-slate-200 dark:border-slate-800 p-4">
                <div className="space-y-4">
                    {categories.length === 0 ? (
                        <p className="text-sm text-center text-muted-foreground py-8 dark:text-slate-500">{t('modals.categories.noCategories')}</p>
                    ) : (
                        categories.map((cat) => (
                            <div key={cat.id} className="flex items-center justify-between group p-2 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-lg transition-colors">
                                <div>
                                    <p className="font-medium text-sm text-slate-900 dark:text-slate-100">{cat.name}</p>
                                    {cat.description && <p className="text-xs text-muted-foreground dark:text-slate-400">{cat.description}</p>}
                                </div>
                                <Badge variant={cat.status === 'active' ? 'default' : 'secondary'} className="text-[10px] bg-slate-900 dark:bg-slate-100 text-slate-50 dark:text-slate-900 hover:bg-slate-900/90 dark:hover:bg-slate-100/90">
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
