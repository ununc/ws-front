import React from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

interface AddMemberModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (name: string) => void;
  type: "leader" | "member";
}

export const AddMemberModal: React.FC<AddMemberModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  type,
}) => {
  const [name, setName] = React.useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (name.trim()) {
      onSubmit(name.trim());
      setName("");
      onClose();
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {type === "leader" ? "리더 추가" : "순원 추가"}
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="grid gap-4 py-4">
            <Input
              placeholder="이름을 입력하세요"
              value={name}
              onChange={(e) => setName(e.target.value)}
              autoFocus
            />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              취소
            </Button>
            <Button type="submit">추가</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};
