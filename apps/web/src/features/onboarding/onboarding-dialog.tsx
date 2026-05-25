import { useEffect, useState } from 'react';
import { GitBranch, LineChart, Save, Settings2, Sparkles, type LucideIcon } from 'lucide-react';

import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

interface OnboardingStep {
  icon: LucideIcon;
  title: string;
  description: string;
}

/** Static, text-only walkthrough — no element highlights, intentionally simple. */
const ONBOARDING_STEPS: OnboardingStep[] = [
  {
    icon: Sparkles,
    title: 'Bienvenue sur RainPath',
    description:
      'Configurez et suivez les relances patient de votre laboratoire. Cette présentation rapide vous montre les fondamentaux. Vous pourrez la relancer à tout moment via le bouton "?" en haut à droite.',
  },
  {
    icon: GitBranch,
    title: 'Composer un workflow',
    description:
      'Depuis la page Workflows, créez une nouvelle séquence. Glissez les types de nœuds (Email, SMS, WhatsApp, Courrier, Attente, Condition) depuis la palette de gauche vers le canvas, puis reliez-les pour dessiner votre parcours de relance.',
  },
  {
    icon: Settings2,
    title: 'Configurer chaque étape',
    description:
      'Cliquez sur un nœud pour ouvrir son panneau de configuration à droite. Vous y saisissez le contenu du message, les délais, les conditions, et choisissez si le secrétariat est notifié.',
  },
  {
    icon: LineChart,
    title: 'Suivre les patients',
    description:
      "Le Dashboard centralise les patients en cours, bloqués, et terminés. Cliquez sur une ligne pour ouvrir le parcours patient : vous y voyez l'étape courante, l'historique des relances et pouvez simuler l'étape suivante.",
  },
  {
    icon: Save,
    title: 'Sauvegarder',
    description:
      "Vos modifications dans l'éditeur ne sont enregistrées qu'au clic sur \"Enregistrer\" (ou Cmd+S). La pastille colorée sur le bouton indique l'état du workflow : verte si tout est cohérent, ambre si avertissements, rouge si erreur critique.",
  },
];

export interface OnboardingDialogProps {
  /** Whether the dialog is visible. */
  open: boolean;
  /** Transient dismissal (X button, Escape, overlay click). */
  onClose: () => void;
  /** Explicit completion (Skip or Terminer) — the parent persists this. */
  onComplete: () => void;
}

/**
 * Five-step modal walkthrough of RainPath. Presentational: it surfaces dismiss
 * (`onClose`) and completion (`onComplete`) intents and lets the parent decide
 * persistence. The step index resets to 0 each time the dialog opens.
 */
export function OnboardingDialog({ open, onClose, onComplete }: OnboardingDialogProps) {
  const [currentStep, setCurrentStep] = useState(0);

  useEffect(() => {
    if (open) setCurrentStep(0);
  }, [open]);

  const step = ONBOARDING_STEPS[currentStep];
  if (!step) return null;

  const Icon = step.icon;
  const isFirst = currentStep === 0;
  const isLast = currentStep === ONBOARDING_STEPS.length - 1;

  const handleNext = () => {
    if (isLast) {
      onComplete();
      return;
    }
    setCurrentStep((s) => s + 1);
  };

  const handlePrev = () => setCurrentStep((s) => Math.max(0, s - 1));

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) onClose();
      }}
    >
      <DialogContent className="sm:max-w-md">
        <DialogHeader className="items-center text-center">
          <span
            aria-hidden
            className="mb-2 flex h-16 w-16 items-center justify-center rounded-full bg-accent text-accent-foreground"
          >
            <Icon className="h-8 w-8" />
          </span>
          <DialogTitle className="text-xl">{step.title}</DialogTitle>
          <DialogDescription className="text-balance leading-relaxed">
            {step.description}
          </DialogDescription>
        </DialogHeader>

        <div className="mt-2 flex items-center justify-center gap-1.5" aria-hidden>
          {ONBOARDING_STEPS.map((_, index) => (
            <span
              key={index}
              className={`h-1.5 rounded-full transition-all ${
                index === currentStep ? 'w-6 bg-primary' : 'w-1.5 bg-muted-foreground/30'
              }`}
            />
          ))}
        </div>

        <div className="mt-2 flex items-center justify-between gap-2">
          <Button variant="ghost" size="sm" onClick={onComplete}>
            Passer
          </Button>

          <span className="text-xs text-muted-foreground">
            Étape {currentStep + 1} / {ONBOARDING_STEPS.length}
          </span>

          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={handlePrev} disabled={isFirst}>
              Précédent
            </Button>
            <Button size="sm" onClick={handleNext}>
              {isLast ? 'Terminer' : 'Suivant'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
