import { useState, useMemo, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useQueryClient } from "@tanstack/react-query";
import {
  useListArticles,
  getListArticlesQueryKey,
  useCreateArticle,
  useGetArticle,
  getGetArticleQueryKey,
  useUpdateArticle,
  useDeleteArticle,
  useListCategories,
  getListCategoriesQueryKey,
} from "@workspace/api-client-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useToast } from "@/hooks/use-toast";
import { Plus, Search, Edit2, Trash2, X, ChevronLeft, Check } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

// --- TYPES & SCHEMAS ---

const DEFAULT_CATEGORIES = [
  "Crop Production",
  "Livestock",
  "Pest Management",
  "Soil Health",
  "Disease Diagnosis",
  "Climate & Irrigation",
  "Agribusiness",
  "Equipment",
];

const LANGUAGE_MAP: Record<string, string> = {
  en: "English",
  sn: "Shona",
  nd: "Ndebele",
  all: "All Languages",
};

const formSchema = z.object({
  title: z.string().min(1, "Title is required"),
  category: z.string().min(1, "Category is required"),
  language: z.enum(["en", "sn", "nd", "all"]),
  tagsString: z.string(),
  content: z.string().min(1, "Content is required"),
  isActive: z.boolean().default(true),
});

type FormValues = z.infer<typeof formSchema>;

// --- COMPONENTS ---

export default function KnowledgeBase() {
  const [view, setView] = useState<"list" | "form">("list");
  const [editingId, setEditingId] = useState<number | null>(null);

  const handleCreateNew = () => {
    setEditingId(null);
    setView("form");
  };

  const handleEdit = (id: number) => {
    setEditingId(id);
    setView("form");
  };

  const handleCancel = () => {
    setView("list");
    setEditingId(null);
  };

  return (
    <div className="flex flex-col h-full bg-muted/20">
      <div className="flex items-center justify-between px-6 py-4 border-b bg-background">
        <div>
          <h1 className="text-2xl font-semibold text-primary">Knowledge Base</h1>
          <p className="text-sm text-muted-foreground">Manage articles for the Mhauri AI assistant</p>
        </div>
        {view === "list" && (
          <Button onClick={handleCreateNew} data-testid="button-create-article">
            <Plus className="w-4 h-4 mr-2" />
            New Article
          </Button>
        )}
      </div>

      <div className="flex-1 overflow-auto p-6">
        {view === "list" ? (
          <ArticleList onEdit={handleEdit} />
        ) : (
          <ArticleForm articleId={editingId} onSaved={handleCancel} onCancel={handleCancel} />
        )}
      </div>
    </div>
  );
}

function ArticleList({ onEdit }: { onEdit: (id: number) => void }) {
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [languageFilter, setLanguageFilter] = useState<string>("all");
  const [deleteId, setDeleteId] = useState<number | null>(null);

  const { data: categoriesData } = useListCategories();
  
  // Create a debounced search term if needed, but react-query will handle it
  // For simplicity we will just pass the raw state to the query
  const { data: articles, isLoading } = useListArticles({
    search: search || undefined,
    category: categoryFilter !== "all" ? categoryFilter : undefined,
    language: languageFilter !== "all" ? languageFilter as any : undefined,
  });

  const deleteArticle = useDeleteArticle();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const categories = useMemo(() => {
    const cats = new Set(DEFAULT_CATEGORIES);
    categoriesData?.forEach(c => cats.add(c));
    return Array.from(cats).sort();
  }, [categoriesData]);

  const handleDelete = async () => {
    if (!deleteId) return;
    try {
      await deleteArticle.mutateAsync({ id: deleteId });
      queryClient.invalidateQueries({ queryKey: getListArticlesQueryKey() });
      queryClient.invalidateQueries({ queryKey: getListCategoriesQueryKey() });
      toast({
        title: "Article deleted",
        description: "The article has been permanently removed.",
      });
    } catch (err) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to delete the article.",
      });
    } finally {
      setDeleteId(null);
    }
  };

  return (
    <div className="flex flex-col gap-6 max-w-6xl mx-auto">
      {/* Filters */}
      <div className="flex flex-col md:flex-row gap-4 p-4 bg-background border rounded-xl shadow-sm">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
          <Input 
            placeholder="Search articles..." 
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
            data-testid="input-search-articles"
          />
        </div>
        <div className="flex flex-col sm:flex-row gap-4">
          <Select value={categoryFilter} onValueChange={setCategoryFilter}>
            <SelectTrigger className="w-[180px]" data-testid="select-filter-category">
              <SelectValue placeholder="Category" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Categories</SelectItem>
              {categories.map(c => (
                <SelectItem key={c} value={c}>{c}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={languageFilter} onValueChange={setLanguageFilter}>
            <SelectTrigger className="w-[160px]" data-testid="select-filter-language">
              <SelectValue placeholder="Language" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Languages</SelectItem>
              <SelectItem value="en">English</SelectItem>
              <SelectItem value="sn">Shona</SelectItem>
              <SelectItem value="nd">Ndebele</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Grid */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <Card key={i} className="flex flex-col">
              <CardHeader className="gap-2">
                <Skeleton className="h-5 w-3/4" />
                <Skeleton className="h-4 w-1/2" />
              </CardHeader>
              <CardContent className="flex-1">
                <Skeleton className="h-16 w-full" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : articles?.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center border-2 border-dashed rounded-xl bg-background">
          <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center mb-4">
            <Search className="h-6 w-6 text-primary" />
          </div>
          <h3 className="text-lg font-medium text-foreground mb-2">No articles found</h3>
          <p className="text-muted-foreground max-w-sm">
            {search || categoryFilter !== "all" || languageFilter !== "all" 
              ? "Try adjusting your filters to find what you're looking for."
              : "Create your first article to start building the knowledge base."}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {articles?.map((article) => (
            <Card 
              key={article.id} 
              className={`flex flex-col transition-all ${!article.isActive ? 'opacity-60 bg-muted/30' : 'bg-background hover:border-primary/50'}`}
              data-testid={`card-article-${article.id}`}
            >
              <CardHeader className="pb-3">
                <div className="flex justify-between items-start mb-2">
                  <Badge variant="outline" className="bg-primary/5 text-primary border-primary/20">
                    {article.category}
                  </Badge>
                  <div className="flex gap-2">
                    {!article.isActive && (
                      <Badge variant="secondary" className="bg-muted text-muted-foreground">Inactive</Badge>
                    )}
                    <Badge variant="outline" className="text-xs">
                      {LANGUAGE_MAP[article.language] || article.language}
                    </Badge>
                  </div>
                </div>
                <CardTitle className="line-clamp-2 text-lg leading-tight">
                  {article.title}
                </CardTitle>
              </CardHeader>
              <CardContent className="flex-1 pb-3">
                <p className="text-sm text-muted-foreground line-clamp-3 mb-4">
                  {article.content}
                </p>
                {article.tags && article.tags.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {article.tags.slice(0, 3).map(tag => (
                      <span key={tag} className="text-[10px] px-2 py-0.5 bg-secondary/10 text-secondary-foreground rounded-full">
                        {tag}
                      </span>
                    ))}
                    {article.tags.length > 3 && (
                      <span className="text-[10px] px-2 py-0.5 bg-muted text-muted-foreground rounded-full">
                        +{article.tags.length - 3}
                      </span>
                    )}
                  </div>
                )}
              </CardContent>
              <CardFooter className="pt-0 flex items-center justify-between border-t p-4 mt-auto">
                <div className="text-xs text-muted-foreground">
                  Updated {formatDistanceToNow(new Date(article.updatedAt), { addSuffix: true })}
                </div>
                <div className="flex gap-1">
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    className="h-8 w-8 text-muted-foreground hover:text-primary"
                    onClick={() => onEdit(article.id)}
                    data-testid={`button-edit-${article.id}`}
                  >
                    <Edit2 className="h-4 w-4" />
                  </Button>
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    className="h-8 w-8 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                    onClick={() => setDeleteId(article.id)}
                    data-testid={`button-delete-${article.id}`}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </CardFooter>
            </Card>
          ))}
        </div>
      )}

      <AlertDialog open={!!deleteId} onOpenChange={(open) => !open && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Article</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this article? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive hover:bg-destructive/90">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function ArticleForm({ articleId, onSaved, onCancel }: { articleId: number | null, onSaved: () => void, onCancel: () => void }) {
  const { data: article, isLoading: isArticleLoading } = useGetArticle(articleId as number, {
    query: {
      enabled: !!articleId,
      queryKey: getGetArticleQueryKey(articleId as number),
    }
  });

  const { data: categoriesData } = useListCategories();
  
  const categories = useMemo(() => {
    const cats = new Set(DEFAULT_CATEGORIES);
    categoriesData?.forEach(c => cats.add(c));
    return Array.from(cats).sort();
  }, [categoriesData]);

  const queryClient = useQueryClient();
  const { toast } = useToast();
  const createArticle = useCreateArticle();
  const updateArticle = useUpdateArticle();

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      title: "",
      category: "",
      language: "all",
      tagsString: "",
      content: "",
      isActive: true,
    },
  });

  // Load article data into form when available
  useEffect(() => {
    if (article) {
      form.reset({
        title: article.title,
        category: article.category,
        language: article.language as "en" | "sn" | "nd" | "all",
        tagsString: article.tags?.join(", ") || "",
        content: article.content,
        isActive: article.isActive,
      });
    }
  }, [article, form]);

  const [tagChips, setTagChips] = useState<string[]>([]);
  const tagsStringValue = form.watch("tagsString");

  // Sync string input to chips for visual display
  useEffect(() => {
    const parsed = tagsStringValue
      .split(",")
      .map(t => t.trim())
      .filter(t => t.length > 0);
    setTagChips(parsed);
  }, [tagsStringValue]);

  const removeTag = (indexToRemove: number) => {
    const newTags = tagChips.filter((_, i) => i !== indexToRemove);
    form.setValue("tagsString", newTags.join(", "), { shouldDirty: true });
  };

  const onSubmit = async (values: FormValues) => {
    const tags = values.tagsString.split(",").map(t => t.trim()).filter(t => t.length > 0);
    
    try {
      if (articleId) {
        await updateArticle.mutateAsync({
          id: articleId,
          data: {
            title: values.title,
            category: values.category,
            language: values.language,
            tags,
            content: values.content,
            isActive: values.isActive,
          }
        });
        toast({ title: "Article updated successfully" });
      } else {
        await createArticle.mutateAsync({
          data: {
            title: values.title,
            category: values.category,
            language: values.language,
            tags,
            content: values.content,
            isActive: values.isActive,
          }
        });
        toast({ title: "Article created successfully" });
      }
      
      queryClient.invalidateQueries({ queryKey: getListArticlesQueryKey() });
      queryClient.invalidateQueries({ queryKey: getListCategoriesQueryKey() });
      onSaved();
    } catch (err) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to save the article.",
      });
    }
  };

  if (articleId && isArticleLoading) {
    return (
      <div className="max-w-4xl mx-auto space-y-6">
        <Skeleton className="h-10 w-48" />
        <Card>
          <CardContent className="p-6 space-y-6">
            <div className="space-y-4">
              <Skeleton className="h-10 w-full" />
              <div className="grid grid-cols-2 gap-4">
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-full" />
              </div>
              <Skeleton className="h-40 w-full" />
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  const isPending = createArticle.isPending || updateArticle.isPending;

  return (
    <div className="max-w-4xl mx-auto">
      <Button variant="ghost" onClick={onCancel} className="mb-6 -ml-4 text-muted-foreground" data-testid="button-back">
        <ChevronLeft className="h-4 w-4 mr-1" />
        Back to list
      </Button>

      <Card>
        <CardHeader>
          <CardTitle>{articleId ? "Edit Article" : "New Article"}</CardTitle>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              
              <FormField
                control={form.control}
                name="title"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Title</FormLabel>
                    <FormControl>
                      <Input placeholder="E.g. Common Maize Pests and Treatments" {...field} data-testid="input-title" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <FormField
                  control={form.control}
                  name="category"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Category</FormLabel>
                      <FormControl>
                        {/* We use a simple datalist approach or just standard input since Select doesn't allow freeform typing easily */}
                        <div className="relative">
                          <Input 
                            list="categories-list" 
                            placeholder="Select or type category..." 
                            {...field} 
                            data-testid="input-category"
                          />
                          <datalist id="categories-list">
                            {categories.map(c => (
                              <option key={c} value={c} />
                            ))}
                          </datalist>
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="language"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Language</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger data-testid="select-language">
                            <SelectValue placeholder="Select language" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="all">All Languages</SelectItem>
                          <SelectItem value="en">English</SelectItem>
                          <SelectItem value="sn">Shona</SelectItem>
                          <SelectItem value="nd">Ndebele</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="tagsString"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Tags (comma separated)</FormLabel>
                    <FormControl>
                      <Input 
                        placeholder="e.g. maize, pests, fall armyworm" 
                        {...field} 
                        data-testid="input-tags"
                      />
                    </FormControl>
                    {tagChips.length > 0 && (
                      <div className="flex flex-wrap gap-2 mt-3">
                        {tagChips.map((tag, idx) => (
                          <Badge key={idx} variant="secondary" className="gap-1 px-3 py-1">
                            {tag}
                            <X 
                              className="h-3 w-3 cursor-pointer hover:text-destructive" 
                              onClick={() => removeTag(idx)} 
                            />
                          </Badge>
                        ))}
                      </div>
                    )}
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="content"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Content</FormLabel>
                    <FormControl>
                      <Textarea 
                        placeholder="Write the full article content here..." 
                        className="min-h-[300px] resize-y font-mono text-sm leading-relaxed" 
                        {...field} 
                        data-testid="textarea-content"
                      />
                    </FormControl>
                    <FormDescription>
                      This content will be used by the AI to answer related questions.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="isActive"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4 shadow-sm bg-muted/30">
                    <div className="space-y-0.5">
                      <FormLabel className="text-base">Active Status</FormLabel>
                      <FormDescription>
                        When active, the AI will use this article to generate answers.
                      </FormDescription>
                    </div>
                    <FormControl>
                      <Switch
                        checked={field.value}
                        onCheckedChange={field.onChange}
                        data-testid="switch-is-active"
                      />
                    </FormControl>
                  </FormItem>
                )}
              />

              <div className="flex justify-end gap-4 pt-4 border-t">
                <Button type="button" variant="outline" onClick={onCancel} disabled={isPending} data-testid="button-cancel-form">
                  Cancel
                </Button>
                <Button type="submit" disabled={isPending} data-testid="button-submit-form" className="bg-primary hover:bg-primary/90">
                  {isPending ? (
                    "Saving..."
                  ) : (
                    <>
                      <Check className="h-4 w-4 mr-2" />
                      {articleId ? "Update Article" : "Create Article"}
                    </>
                  )}
                </Button>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}
