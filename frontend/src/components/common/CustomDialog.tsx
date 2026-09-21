import React from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import { X } from 'lucide-react';

interface CustomDialogProps {
  children: React.ReactNode;
  title: string;
  trigger: React.ReactNode;
  isOpen: boolean;
  setIsOpen: (isOpen: boolean) => void;
}

const CustomDialog: React.FC<CustomDialogProps> = ({
  children,
  title,
  trigger,
  isOpen,
  setIsOpen
}) => (
  <Dialog.Root open={isOpen} onOpenChange={setIsOpen}>
    <Dialog.Trigger asChild>{trigger}</Dialog.Trigger>

    <Dialog.Portal>
      <Dialog.Overlay className="fixed inset-0 bg-black/50 backdrop-blur-sm" />
      <Dialog.Content className="fixed left-1/2 top-1/2 z-50 w-full max-w-lg -translate-x-1/2 -translate-y-1/2 bg-white rounded-lg shadow-lg p-6">
        
        {/* Header */}
        <div className="flex justify-between items-center border-b pb-3 mb-4">
          <Dialog.Title className="text-lg font-semibold">{title}</Dialog.Title>
          <Dialog.Close asChild>
            <button className="p-1 rounded-full hover:bg-gray-100">
              <X size={18} />
            </button>
          </Dialog.Close>
        </div>

        {/* Body */}
        <div>{children}</div>
      </Dialog.Content>
    </Dialog.Portal>
  </Dialog.Root>
);

export default CustomDialog;
