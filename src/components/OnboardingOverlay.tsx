import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { Spotlight } from "@/components/Spotlight";

const STORAGE_KEY = "pdf-tailor-onboarding-completed";

function isOnboardingCompleted() {
  if (typeof window === "undefined") return false;
  return localStorage.getItem(STORAGE_KEY) === "true";
}

function setOnboardingCompleted(value: boolean) {
  localStorage.setItem(STORAGE_KEY, String(value));
}

interface Step {
  id: string;
  title: string;
  description: string;
  target: string; // CSS selector or special key
}

const STEPS: Step[] = [
  {
    id: "open-pdf",
    title: "onboarding.step1Title",
    description: "onboarding.step1Desc",
    target: "[data-testid='dropzone']",
  },
  {
    id: "draw-crop",
    title: "onboarding.step2Title",
    description: "onboarding.step2Desc",
    target: "[data-testid='crop-layer']",
  },
  {
    id: "batch-apply",
    title: "onboarding.step3Title",
    description: "onboarding.step3Desc",
    target: "[data-testid='page-thumbnail-0']",
  },
  {
    id: "preview",
    title: "onboarding.step4Title",
    description: "onboarding.step4Desc",
    target: "button[aria-label='Preview'], button:has-text('Preview')",
  },
  {
    id: "export",
    title: "onboarding.step5Title",
    description: "onboarding.step5Desc",
    target: "button[aria-label='Export'], button:has-text('Export')",
  },
];

function findElement(selector: string): HTMLElement | null {
  return document.querySelector(selector);
}

export function OnboardingOverlay() {
  const { t } = useTranslation();
  const [completed, setCompleted] = useState(() => isOnboardingCompleted());
  const [currentStep, setCurrentStep] = useState(0);
  const [visible, setVisible] = useState(false);
  const [targetRef, setTargetRef] = useState<React.RefObject<HTMLElement | null>>({ current: null });
  const stepRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (completed) return;
    const timer = setTimeout(() => setVisible(true), 800);
    return () => clearTimeout(timer);
  }, [completed]);

  useEffect(() => {
    if (!visible || completed) return;

    const step = STEPS[currentStep];
    if (!step) return;

    const el = findElement(step.target);
    if (el) {
      setTargetRef({ current: el });
    }

    // Scroll the target into view
    el?.scrollIntoView({ behavior: "smooth", block: "center" });
  }, [visible, currentStep, completed]);

  const handleNext = () => {
    if (currentStep < STEPS.length - 1) {
      setCurrentStep((s) => s + 1);
    } else {
      setVisible(false);
      setCompleted(true);
      setOnboardingCompleted(true);
    }
  };

  const handleSkip = () => {
    setVisible(false);
    setCompleted(true);
    setOnboardingCompleted(true);
  };

  if (completed || !visible) return null;

  const step = STEPS[currentStep];
  const progress = ((currentStep + 1) / STEPS.length) * 100;

  return (
    <div
      className="fixed inset-0 z-[200] flex items-end justify-center"
      aria-live="polite"
    >
      {targetRef.current && <Spotlight targetRef={targetRef} padding={12} />}

      {/* Card */}
      <div
        ref={stepRef}
        className="panel-surface mb-12 mr-12 max-w-sm rounded-[24px] border border-ink/12 p-6 shadow-2xl"
        style={{ position: "fixed", bottom: "3rem", right: "3rem", zIndex: 201 }}
      >
        {/* Progress bar */}
        <div className="mb-4 h-1.5 overflow-hidden rounded-full bg-ink/10 dark:bg-white/10">
          <div
            className="h-full rounded-full bg-sky transition-all duration-300 dark:bg-sky-dark"
            style={{ width: `${progress}%` }}
          />
        </div>

        {/* Step indicator */}
        <div className="mb-3 text-[10px] uppercase tracking-[0.2em] text-ink/45 dark:text-ink-light/45">
          {t("onboarding.stepLabel", { current: currentStep + 1, total: STEPS.length })}
        </div>

        <div className="mb-4">
          <div className="mb-2 text-xl font-semibold text-ink dark:text-ink-light">
            {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
            {(t as any)(step.title)}
          </div>
          <div className="text-sm leading-relaxed text-ink/60 dark:text-ink-light/55">
            {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
            {(t as any)(step.description)}
          </div>
        </div>

        <div className="flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={handleSkip}
            className="rounded-full px-4 py-2 text-sm font-medium text-ink/45 transition hover:text-ink dark:text-ink-light/45 dark:hover:text-ink-light"
          >
            {t("onboarding.skip")}
          </button>
          <button
            type="button"
            onClick={handleNext}
            className="rounded-full bg-sky px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-sky/90 dark:bg-sky-dark dark:hover:bg-sky-dark/90"
          >
            {currentStep < STEPS.length - 1 ? t("onboarding.next") : t("onboarding.done")}
          </button>
        </div>
      </div>
    </div>
  );
}
