import { useEffect, useState } from 'react';
import { ExternalLink } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import type { PortfolioContent } from '@/portfolio/content';
import { fetchPortfolio, savePortfolio } from '@/services/portfolioApi';
import EntityList from './EntityList';
import {
  certificationsConfig,
  educationConfig,
  experiencesConfig,
  languagesConfig,
  linksConfig,
  projectsConfig,
  skillGroupsConfig,
  statsConfig
} from './lists';
import ProfileForm from './ProfileForm';

/** Manage everything shown on the public site: profile, numbers, skills, experience, education, certifications, languages, projects and links. */
export default function PortfolioAdmin() {
  const [content, setContent] = useState<PortfolioContent | null>(null);
  const [loadError, setLoadError] = useState('');

  useEffect(() => {
    const controller = new AbortController();
    fetchPortfolio(controller.signal)
      .then(setContent)
      .catch(err => {
        if (!controller.signal.aborted) setLoadError(err instanceof Error ? err.message : 'Impossibile caricare il portfolio.');
      });
    return () => controller.abort();
  }, []);

  if (loadError) return <p role="alert" className="text-destructive">{loadError}</p>;
  if (!content) return <p role="status">Caricamento portfolio...</p>;

  /** Replaces part of the published document. Each change is saved and published at once. */
  async function persist(patch: Partial<PortfolioContent>) {
    const saved = await savePortfolio({ ...content!, ...patch });
    setContent(saved);
    toast.success('Modifica pubblicata');
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-xs font-bold uppercase tracking-widest text-primary">Sito pubblico</p>
          <h1 className="text-3xl font-extrabold tracking-tight">Portfolio</h1>
          <p className="mt-1 max-w-2xl text-muted-foreground">Aggiungi, modifica, riordina ed elimina ogni parte del sito. Ogni salvataggio è pubblico subito.</p>
        </div>
        <Button variant="outline" asChild>
          <a href="/" target="_blank" rel="noreferrer">Vedi il sito <ExternalLink /></a>
        </Button>
      </div>

      <Tabs defaultValue="profilo">
        <TabsList className="flex h-auto flex-wrap justify-start">
          <TabsTrigger value="profilo">Profilo</TabsTrigger>
          <TabsTrigger value="numeri">Numeri</TabsTrigger>
          <TabsTrigger value="competenze">Competenze</TabsTrigger>
          <TabsTrigger value="esperienza">Esperienza</TabsTrigger>
          <TabsTrigger value="formazione">Formazione</TabsTrigger>
          <TabsTrigger value="certificazioni">Certificazioni</TabsTrigger>
          <TabsTrigger value="lingue">Lingue</TabsTrigger>
          <TabsTrigger value="progetti">Progetti</TabsTrigger>
          <TabsTrigger value="link">Link</TabsTrigger>
        </TabsList>

        <TabsContent value="profilo">
          <ProfileForm
            content={content}
            onSave={async patch => { await persist(patch); }}
            onPhotoChange={photoUrl => setContent(current => (current ? { ...current, photoUrl } : current))}
          />
        </TabsContent>
        <TabsContent value="numeri">
          <EntityList config={statsConfig} items={content.stats ?? []} onChange={stats => persist({ stats })} />
        </TabsContent>
        <TabsContent value="competenze">
          <EntityList config={skillGroupsConfig} items={content.skillGroups} onChange={skillGroups => persist({ skillGroups })} />
        </TabsContent>
        <TabsContent value="esperienza">
          <EntityList config={experiencesConfig} items={content.experiences} onChange={experiences => persist({ experiences })} />
        </TabsContent>
        <TabsContent value="formazione">
          <EntityList config={educationConfig} items={content.education ?? []} onChange={education => persist({ education })} />
        </TabsContent>
        <TabsContent value="certificazioni">
          <EntityList config={certificationsConfig} items={content.certifications ?? []} onChange={certifications => persist({ certifications })} />
        </TabsContent>
        <TabsContent value="lingue">
          <EntityList config={languagesConfig} items={content.languages ?? []} onChange={languages => persist({ languages })} />
        </TabsContent>
        <TabsContent value="progetti">
          <EntityList config={projectsConfig} items={content.projects} onChange={projects => persist({ projects })} />
        </TabsContent>
        <TabsContent value="link">
          <EntityList config={linksConfig} items={content.links} onChange={links => persist({ links })} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
