import { ClientForm } from "@/components/clients/client-form";
import { Card, CardContent } from "@/components/ui/card";

export default function CreateClientPage() {
  return (
    <div className="max-w-2xl mx-auto">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Add New Client</h1>
      <ClientForm />
    </div>
  );
}
