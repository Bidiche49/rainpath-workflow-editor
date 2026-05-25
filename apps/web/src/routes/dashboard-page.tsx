import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

export function DashboardPage() {
  return (
    <div className="mx-auto max-w-6xl px-6 py-8">
      <h1 className="text-2xl font-semibold tracking-tight">Suivi des relances</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Vue d'ensemble des patients et de l'avancement des relances.
      </p>

      <Card className="mt-6">
        <CardHeader>
          <CardTitle>Bientôt disponible</CardTitle>
          <CardDescription>
            Les statistiques et la table des patients arrivent en phase d'intégration.
          </CardDescription>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">
          Dashboard scaffolding — wired in I-04.
        </CardContent>
      </Card>
    </div>
  );
}
