"use client";

import { useEffect, useRef, useState } from "react";
import type { AssistantState, ServiceItem, Vehicle } from "@/domain/models";
import { selectable } from "@/domain/booking";
import {
  answerDemoAssistant,
  startDemoAssistant,
} from "@/domain/assistant-demo";
import { PrimaryButton, TextButton } from "./booking-ui";

interface ServiceAssistantProps {
  state: AssistantState;
  onStateChange(state: AssistantState): void;
  catalogue: ServiceItem[];
  vehicle: Vehicle | null;
  selectedMainId: string | null;
  onAddRecommendation(serviceId: string, workshopNotes?: string): void;
  onManualSelection(): void;
  focusRequest: number;
  expanded: boolean;
  onExpandedChange(expanded: boolean): void;
}

export function ServiceAssistant({
  state,
  onStateChange,
  catalogue,
  vehicle,
  selectedMainId,
  onAddRecommendation,
  onManualSelection,
  focusRequest,
  expanded,
  onExpandedChange,
}: ServiceAssistantProps) {
  const [description, setDescription] = useState("");
  const [followup, setFollowup] = useState("");
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (focusRequest === 0) return;
    rootRef.current?.scrollIntoView?.({ behavior: "smooth", block: "center" });
    inputRef.current?.focus();
  }, [focusRequest]);

  function start(text: string) {
    if (!text.trim()) return;
    onStateChange(startDemoAssistant(text));
    setDescription("");
    setFollowup("");
    onExpandedChange(true);
  }

  function answer(text: string) {
    if (!text.trim()) return;
    onStateChange(answerDemoAssistant(state, text, catalogue, vehicle));
    setFollowup("");
  }

  const options =
    state.kind === "clarification" && state.intent === "routine-service"
      ? ["Routine servicing", "A specific problem", "I'm not sure"]
      : ["Mostly over bumps", "At low speed", "I'm not sure"];
  const suggested =
    state.kind === "recommendation"
      ? catalogue.find(
          (item) => item.id === state.serviceId && selectable(item, vehicle),
        )
      : undefined;

  return (
    <div className="assistant-panel" ref={rootRef}>
      <div className="assistant-heading">
        <div>
          <h2>Not sure what service you need?</h2>
          <p>
            Tell us what&apos;s happening with your car, and we&apos;ll help you
            find a service to review.
          </p>
        </div>
        <span className="demo-badge">
          Prototype assistant — demonstration responses
        </span>
      </div>
      <p className="assistant-caveat">
        Auto Services Assistant uses deterministic demonstration responses. It
        is not live AI or a mechanical diagnosis.
      </p>
      <label className="field" htmlFor="assistant-description">
        <span>What would you like help with?</span>
        <textarea
          id="assistant-description"
          ref={inputRef}
          className="input assistant-input"
          value={description}
          onChange={(event) => setDescription(event.target.value)}
          placeholder="My car makes a rattling noise when driving over bumps..."
          rows={2}
        />
      </label>
      <div className="assistant-actions">
        <PrimaryButton onClick={() => start(description)}>
          Help me find a service
        </PrimaryButton>
        {state.kind !== "idle" && !expanded && (
          <TextButton onClick={() => onExpandedChange(true)}>
            Resume conversation
          </TextButton>
        )}
      </div>
      <div className="demo-prompts">
        <span>Explore the demo:</span>
        <TextButton onClick={() => start("I need an oil change")}>
          Routine service
        </TextButton>
        <TextButton onClick={() => start("My brakes failed and I cannot stop")}>
          Braking safety
        </TextButton>
      </div>
      {expanded && state.kind !== "idle" && (
        <div className="assistant-conversation" aria-live="polite">
          <div className="conversation-title">
            <h3>Service help</h3>
            <TextButton onClick={() => onExpandedChange(false)}>
              Close conversation
            </TextButton>
          </div>
          {state.messages.map((message, index) => (
            <div key={index} className={`message ${message.role}`}>
              <span className="message-label">
                {message.role === "user" ? "You" : "Service help · demo"}
              </span>
              <p>{message.text}</p>
            </div>
          ))}
          {state.kind === "clarification" && (
            <div className="clarification">
              <p className="clarification-label">Choose an answer</p>
              <div className="choice-row">
                {options.map((option) => (
                  <button
                    key={option}
                    className="choice"
                    onClick={() => answer(option)}
                  >
                    {option}
                  </button>
                ))}
              </div>
              <label className="field" htmlFor="assistant-followup">
                <span>Or tell us in your own words</span>
                <input
                  id="assistant-followup"
                  className="input"
                  value={followup}
                  onChange={(event) => setFollowup(event.target.value)}
                  placeholder="Add more detail"
                />
              </label>
              <PrimaryButton
                onClick={() => answer(followup)}
                disabled={!followup.trim()}
              >
                Continue
              </PrimaryButton>
            </div>
          )}
          {state.kind === "recommendation" && suggested && (
            <div className="assistant-result">
              <span className="result-kicker">
                Demonstration catalogue match
              </span>
              <h4>{suggested.name}</h4>
              <p>
                {state.explanation ??
                  "Review this demonstration catalogue item before selecting it."}
              </p>
              {state.workshopNotes && (
                <p className="workshop-note">
                  <strong>Workshop note:</strong> {state.workshopNotes}
                </p>
              )}
              <PrimaryButton
                onClick={() =>
                  onAddRecommendation(suggested.id, state.workshopNotes)
                }
                disabled={selectedMainId === suggested.id}
              >
                {selectedMainId === suggested.id
                  ? "Added to selection"
                  : "Add to selection"}
              </PrimaryButton>
            </div>
          )}
          {state.kind === "recommendation" && !suggested && (
            <div className="assistant-result unable">
              <h4>Unable to match a service</h4>
              <p>
                The suggested item is not in the current catalogue or is not
                suitable for this vehicle in the demo. Please ask the workshop
                for help.
              </p>
            </div>
          )}
          {state.kind === "cannot-match" && (
            <div className="assistant-result unable">
              <h4>We couldn&apos;t match that safely</h4>
              <p>
                No appropriate inspection item is available in this
                demonstration catalogue. Contact the workshop for help choosing
                a service. No repair has been inferred.
              </p>
            </div>
          )}
          {state.kind === "safety-escalation" && (
            <div className="assistant-result safety" role="alert">
              <h4>Safety first</h4>
              <p>
                Do not continue driving. Arrange appropriate roadside assistance
                or recovery. This demo cannot assess the fault or recommend a
                normal workshop drive.
              </p>
            </div>
          )}
          <TextButton className="manual-link" onClick={onManualSelection}>
            Return to manual service selection
          </TextButton>
        </div>
      )}
    </div>
  );
}
