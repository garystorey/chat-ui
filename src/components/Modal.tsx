import { Button, ButtonProps } from "./elements";
import {
  ComponentPropsWithoutRef,
  ComponentPropsWithRef,
  createContext,
  useContext,
} from "react";
import { Show } from "./layout";

const ModalContext = createContext<"open" | "closed">("open");

function useModalContext() {
  const context = useContext(ModalContext);
  if (!context)
    throw new Error(
      `Component can not be used outside of a <Modal /> component block.`
    );
  return context;
}

export type ModalContainerProps = ComponentPropsWithRef<"dialog"> & {
  isOpen?: boolean;
};

export function Modal({
  children,
  isOpen = true,
  ...props
}: ModalContainerProps) {
  return (
    <ModalContext.Provider value={isOpen ? "open" : "closed"}>
      <Show when={isOpen}>
        <dialog open data-modal {...props}>
          {children}
        </dialog>
      </Show>
    </ModalContext.Provider>
  );
}

export type ModalHeaderProps = ComponentPropsWithRef<"header">;

function ModalHeader({ children, ...props }: ModalHeaderProps) {
  useModalContext();
  return (
    <header {...props} data-modal-header>
      {children}
    </header>
  );
}

export type ModalFooterProps = ComponentPropsWithoutRef<"footer">;

function ModalFooter({ children, ...props }: ModalHeaderProps) {
  useModalContext();
  return (
    <footer data-modal-footer {...props}>
      {children}
    </footer>
  );
}

export type ModalBodyProps = ComponentPropsWithoutRef<"section">;

function ModalBody({ children, ...props }: ModalHeaderProps) {
  useModalContext();
  return (
    <section data-modal-body {...props}>
      {children}
    </section>
  );
}

export type ModalCloseButtonProps = Omit<ButtonProps, "as" | "children">;

function ModalCloseButton({ className, ...props }: ModalCloseButtonProps) {
  useModalContext();
  return (
    <Button className={`cursor-pointer ${className}`} {...props} variant="text">
      &times;
    </Button>
  );
}
Modal.Header = ModalHeader;
Modal.Footer = ModalFooter;
Modal.Body = ModalBody;
Modal.CloseButton = ModalCloseButton;
