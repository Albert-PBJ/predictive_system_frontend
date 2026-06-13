import { useEffect, useState } from "react";
import { Modal } from "../ui/modal";
import Label from "../form/Label";
import Input from "../form/input/InputField";
import TextArea from "../form/input/TextArea";
import Button from "../ui/button/Button";
import Alert from "../ui/alert/Alert";
import {
  customersService,
  CUSTOMER_TYPES,
  type Customer,
  type CustomerInput,
} from "../../services/customersService";
import { getApiError } from "../../services/apiError";

// Estilo de los <select> nativos para igualar al componente Select del template
// (el formulario los usa controlados, por eso no reutiliza ese componente).
const selectClass =
  "h-11 w-full appearance-none rounded-lg border border-gray-300 bg-transparent px-4 py-2.5 pr-10 text-sm text-gray-800 shadow-theme-xs focus:border-brand-300 focus:outline-hidden focus:ring-3 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  customer: Customer | null; // null = crear
  onSaved: () => void;
}

const EMPTY = {
  rif: "",
  company_name: "",
  customer_type: "CORP",
  sector: "",
  contact_first_name: "",
  contact_last_name: "",
  contact_ci: "",
  phone: "",
  mobile: "",
  email: "",
  state: "",
  municipality: "",
  parish: "",
  fiscal_address: "",
  total_employees: "",
  is_active_customer: false,
};

type FormState = typeof EMPTY;

function fromCustomer(c: Customer): FormState {
  return {
    rif: c.rif,
    company_name: c.company_name,
    customer_type: c.customer_type,
    sector: c.sector,
    contact_first_name: c.contact_first_name,
    contact_last_name: c.contact_last_name,
    contact_ci: c.contact_ci,
    phone: c.phone,
    mobile: c.mobile,
    email: c.email,
    state: c.state,
    municipality: c.municipality,
    parish: c.parish,
    fiscal_address: c.fiscal_address,
    total_employees: c.total_employees != null ? String(c.total_employees) : "",
    is_active_customer: c.is_active_customer,
  };
}

export default function CustomerFormModal({ isOpen, onClose, customer, onSaved }: Props) {
  const [form, setForm] = useState<FormState>(EMPTY);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isEdit = customer !== null;

  useEffect(() => {
    if (isOpen) {
      setForm(customer ? fromCustomer(customer) : EMPTY);
      setError(null);
    }
  }, [isOpen, customer]);

  const set = <K extends keyof FormState>(key: K, value: FormState[K]) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  const handleSubmit = async () => {
    setError(null);
    if (!form.rif.trim()) {
      setError("El RIF / cédula fiscal es obligatorio.");
      return;
    }
    if (!form.company_name.trim()) {
      setError("La razón social / nombre es obligatorio.");
      return;
    }

    const employees = form.total_employees.trim();
    const payload: CustomerInput = {
      rif: form.rif.trim(),
      company_name: form.company_name.trim(),
      customer_type: form.customer_type,
      sector: form.sector.trim(),
      contact_first_name: form.contact_first_name.trim(),
      contact_last_name: form.contact_last_name.trim(),
      contact_ci: form.contact_ci.trim(),
      phone: form.phone.trim(),
      mobile: form.mobile.trim(),
      email: form.email.trim(),
      state: form.state.trim(),
      municipality: form.municipality.trim(),
      parish: form.parish.trim(),
      fiscal_address: form.fiscal_address.trim(),
      total_employees: employees ? Math.max(0, Math.floor(Number(employees) || 0)) : null,
      is_active_customer: form.is_active_customer,
    };

    setSubmitting(true);
    try {
      if (isEdit) await customersService.update(customer!.id, payload);
      else await customersService.create(payload);
      onSaved();
      onClose();
    } catch (err) {
      setError(getApiError(err, "No se pudo guardar el cliente."));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} className="m-4 max-w-3xl">
      <div className="flex max-h-[85vh] flex-col">
        <div className="px-6 pt-6 sm:px-8">
          <h3 className="text-lg font-semibold text-gray-800 dark:text-white/90">
            {isEdit ? `Editar cliente · ${customer!.company_name}` : "Nuevo cliente"}
          </h3>
          {error && (
            <div className="mt-4">
              <Alert variant="error" title="No se pudo guardar" message={error} />
            </div>
          )}
        </div>

        <div className="custom-scrollbar overflow-y-auto px-6 py-5 sm:px-8">
          {/* Identificación */}
          <Section title="Identificación">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <Label>RIF / Cédula fiscal *</Label>
                <Input value={form.rif} onChange={(e) => set("rif", e.target.value)} placeholder="J-12345678-9" />
              </div>
              <div>
                <Label>Razón social / Nombre *</Label>
                <Input value={form.company_name} onChange={(e) => set("company_name", e.target.value)} placeholder="Comercial XYZ, C.A." />
              </div>
              <div>
                <Label>Tipo de cliente</Label>
                <select className={selectClass} value={form.customer_type} onChange={(e) => set("customer_type", e.target.value)}>
                  {CUSTOMER_TYPES.map((t) => (
                    <option key={t.value} value={t.value}>{t.label}</option>
                  ))}
                </select>
              </div>
              <div>
                <Label>Sector</Label>
                <Input value={form.sector} onChange={(e) => set("sector", e.target.value)} placeholder="Educación, salud, retail…" />
              </div>
              <div>
                <Label>Estado del cliente</Label>
                <select
                  className={selectClass}
                  value={form.is_active_customer ? "true" : "false"}
                  onChange={(e) => set("is_active_customer", e.target.value === "true")}
                >
                  <option value="true">Cliente activo</option>
                  <option value="false">Prospecto / Inactivo</option>
                </select>
              </div>
              <div>
                <Label>N° de empleados</Label>
                <Input type="number" min="0" step={1} value={form.total_employees} onChange={(e) => set("total_employees", e.target.value)} placeholder="Opcional" />
              </div>
            </div>
          </Section>

          {/* Contacto */}
          <Section title="Contacto">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <Label>Nombre del contacto</Label>
                <Input value={form.contact_first_name} onChange={(e) => set("contact_first_name", e.target.value)} />
              </div>
              <div>
                <Label>Apellido del contacto</Label>
                <Input value={form.contact_last_name} onChange={(e) => set("contact_last_name", e.target.value)} />
              </div>
              <div>
                <Label>Cédula del contacto</Label>
                <Input value={form.contact_ci} onChange={(e) => set("contact_ci", e.target.value)} placeholder="V-12345678" />
              </div>
              <div>
                <Label>Correo electrónico</Label>
                <Input type="email" value={form.email} onChange={(e) => set("email", e.target.value)} placeholder="contacto@empresa.com" />
              </div>
              <div>
                <Label>Teléfono</Label>
                <Input value={form.phone} onChange={(e) => set("phone", e.target.value)} placeholder="0241-1234567" />
              </div>
              <div>
                <Label>Celular</Label>
                <Input value={form.mobile} onChange={(e) => set("mobile", e.target.value)} placeholder="0412-1234567" />
              </div>
            </div>
          </Section>

          {/* Ubicación */}
          <Section title="Ubicación">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <div>
                <Label>Estado</Label>
                <Input value={form.state} onChange={(e) => set("state", e.target.value)} placeholder="Carabobo" />
              </div>
              <div>
                <Label>Municipio</Label>
                <Input value={form.municipality} onChange={(e) => set("municipality", e.target.value)} placeholder="Valencia" />
              </div>
              <div>
                <Label>Parroquia</Label>
                <Input value={form.parish} onChange={(e) => set("parish", e.target.value)} />
              </div>
              <div className="sm:col-span-3">
                <Label>Dirección fiscal</Label>
                <TextArea rows={3} value={form.fiscal_address} onChange={(v) => set("fiscal_address", v)} placeholder="Dirección fiscal completa (opcional)" />
              </div>
            </div>
          </Section>
        </div>

        <div className="flex justify-end gap-3 border-t border-gray-100 px-6 py-4 dark:border-gray-800 sm:px-8">
          <Button variant="outline" onClick={onClose} disabled={submitting}>
            Cancelar
          </Button>
          <Button onClick={handleSubmit} disabled={submitting}>
            {submitting ? "Guardando…" : isEdit ? "Guardar cambios" : "Crear cliente"}
          </Button>
        </div>
      </div>
    </Modal>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mb-6 last:mb-0">
      <h4 className="mb-3 text-sm font-semibold text-gray-700 dark:text-gray-300">{title}</h4>
      {children}
    </div>
  );
}
