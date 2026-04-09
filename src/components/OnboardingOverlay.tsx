import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { Spotlight } from "@/components/Spotlight";
import { useFocusTrap } from "@/hooks/useFocusTrap";
import { usePdfStore } from "@/store/usePdfStore";

interface Step {
  id: string;
  title: string;
  description: string;
  targets: string[];
}

const STEPS: Step[] = [
  {
    id: "open-pdf",
    title: "onboarding.step1Title",
    description: "onboarding.step1Desc",
    targets: [
      "[data-testid='choose-pdf-button']",
      "[data-testid='open-pdf-button']",
      "[data-testid='dropzone']",
    ],
  },
  {
    id: "draw-crop",
    title: "onboarding.step2Title",
    description: "onboarding.step2Desc",
    targets: ["[data-testid='workspace-viewport']", "#tab-workspace", "[data-testid='dropzone']"],
  },
  {
    id: "batch-apply",
    title: "onboarding.step3Title",
    description: "onboarding.step3Desc",
    targets: ["[data-testid='page-thumbnail-0']", "#tab-pages"],
  },
  {
    id: "preview",
    title: "onboarding.step4Title",
    description: "onboarding.step4Desc",
    targets: ["[data-testid='preview-button']"],
  },
  {
    id: "export",
    title: "onboarding.step5Title",
    description: "onboarding.step5Desc",
    targets: ["[data-testid='export-button']"],
  },
];

function isElementVisible(element: HTMLElement) {
  const rect = element.getBoundingClientRect();
  const style = window.getComputedStyle(element);

  return (
    rect.width > 0 &&
    rect.height > 0 &&
    style.display !== "none" &&
    style.visibility !== "hidden"
  );
}

function findElement(selectors: string[]): HTMLElement | null {
  for (const selector of selectors) {
    const element = document.querySelector<HTMLElement>(selector);
    if (element && isElementVisible(element)) {
      return element;
    }
  }

  return null;
}

export function OnboardingOverlay() {
  const { t } = useTranslation();
  const completed = usePdfStore((state) => state.onboardingCompleted);
  const setCompleted = usePdfStore((state) => state.setOnboardingCompleted);
  const currentStep = usePdfStore((state) => state.onboardingStep);
  const setCurrentStep = usePdfStore((state) => state.setOnboardingStep);
  const fileName = usePdfStore((state) => state.fileName);
  const pageCount = usePdfStore((state) => state.pageCount);
  const documentLoadState = usePdfStore((state) => state.documentLoadState);
  const [visible, setVisible] = useState(false);
  const [targetElement, setTargetElement] = useState<HTMLElement | null>(null);
  const stepRef = useRef<HTMLDivElement>(null);
  const targetRef = useMemo(() => ({ current: targetElement }), [targetElement]);
  const hasReadyDocument = Boolean(fileName) && pageCount > 0 && documentLoadState === "ready";
  const canShowCurrentStep = currentStep === 0 || hasReadyDocument;
  useFocusTrap(stepRef, visible && !completed);

  useEffect(() => {
    if (completed) {
      setVisible(false);
      return;
    }

    if (!canShowCurrentStep) {
      setVisible(false);
      return;
    }

    const timer = setTimeout(() => setVisible(true), currentStep === 0 ? 800 : 250);
    return () => clearTimeout(timer);
  }, [completed, canShowCurrentStep, currentStep]);

  useEffect(() => {
    if (!visible || completed) return;

    const step = STEPS[currentStep];
    if (!step) return;

    let frameId: number | null = null;
    let pollTimer: ReturnType<typeof setInterval> | null = null;

    const updateTarget = () => {
      const nextTarget = findElement(step.targets);
      setTargetElement((currentTarget) => {
        if (currentTarget === nextTarget) {
          return currentTarget;
        }

        if (nextTarget) {
          nextTarget.scrollIntoView({
            behavior: "smooth",
            block: "center",
            inline: "nearest",
          });
        }

        return nextTarget;
      });
    };

    updateTarget();

    // Poll instead of observing full document.body mutations
    // Observing { subtree: true } on body fires on every React re-render
    pollTimer = setInterval(updateTarget, 250);

    window.addEventListener("resize", updateTarget);

    return () => {
      if (pollTimer !== null) clearInterval(pollTimer);
      window.removeEventListener("resize", updateTarget);
      if (frameId !== null) window.cancelAnimationFrame(frameId);
    };
  }, [visible, completed, currentStep, fileName, pageCount, documentLoadState]);

  const handleNext = useCallback(() => {
    if (currentStep < STEPS.length - 1) {
      const nextStep = currentStep + 1;
      setCurrentStep(nextStep);

      if (nextStep > 0 && !hasReadyDocument) {
        setVisible(false);
      }
    } else {
      setVisible(false);
      setCurrentStep(0);
      setCompleted(true);
    }
  }, [currentStep, hasReadyDocument, setCompleted, setCurrentStep]);

  const handleSkip = useCallback(() => {
    setVisible(false);
    setCurrentStep(0);
    setCompleted(true);
  }, [setCompleted, setCurrentStep]);

  useEffect(() => {
    if (!visible || completed) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        handleSkip();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [visible, completed, handleSkip]);

  if (completed || !visible) return null;

  const step = STEPS[currentStep];
  const progress = ((currentStep + 1) / STEPS.length) * 100;
  const titleId = `onboarding-step-title-${step.id}`;
  const descriptionId = `onboarding-step-description-${step.id}`;

  return (
    <div
      className="pointer-events-none fixed inset-0 z-[200] flex items-end justify-center"
      aria-live="polite"
    >
      {targetElement ? <Spotlight targetRef={targetRef} padding={12} /> : null}

      <div
        ref={stepRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={descriptionId}
        className="panel-surface pointer-events-auto mb-12 mr-12 max-w-sm rounded-[24px] border border-ink/12 p-6 shadow-2xl"
        style={{ position: "fixed", bottom: "3rem", right: "3rem", zIndex: 201 }}
      >
        <div className="mb-4 h-1.5 overflow-hidden rounded-full bg-ink/10 dark:bg-white/10">
          <div
            className="h-full rounded-full bg-sky transition-all duration-300 dark:bg-sky-dark"
            style={{ width: `${progress}%` }}
          />
        </div>

        <div className="mb-3 text-[10px] uppercase tracking-[0.2em] text-ink/45 dark:text-ink-light/45">
          {t("onboarding.stepLabel", { current: currentStep + 1, total: STEPS.length })}
        </div>

        <div className="mb-4">
          <div id={titleId} className="mb-2 text-xl font-semibold text-ink dark:text-ink-light">
            {(t as any)(step.title)}
          </div>
          <div id={descriptionId} className="text-sm leading-relaxed text-ink/60 dark:text-ink-light/55">
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
