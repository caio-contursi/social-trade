"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import {
  ArrowUpRight,
  Building2,
  HeartHandshake,
  MapPin,
  Pencil,
  Plus,
  Save,
} from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/components/auth-provider";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import {
  areaLabels,
  brazilStates,
  formatDate,
  organizationLabels,
} from "@/lib/catalog";
import type { Catalog, Membership, Organization } from "@/lib/types";
import {
  EmptyState,
  FormError,
  useSessionRequest,
  useWorkspaceResource,
  WorkspaceError,
  WorkspaceHeading,
  WorkspaceLoading,
} from "./shared";

export function OrganizationsPage() {
  const { user } = useAuth();
  if (!user) return null;
  return user.account_type === "person" ? (
    <PersonalOrganizations />
  ) : (
    <InstitutionOrganizations donor={user.account_type === "donor"} />
  );
}

function PersonalOrganizations() {
  const memberships = useWorkspaceResource<Membership[]>(
    "/api/memberships/mine",
  );
  const organizations = useWorkspaceResource<Organization[]>(
    "/api/organizations/mine",
  );
  const error = memberships.error || organizations.error;
  return (
    <>
      <WorkspaceHeading
        eyebrow="Participação"
        title="Meus vínculos."
        description="Os projetos sociais dos quais você participa e as organizações associadas à sua conta."
      />
      {error ? (
        <WorkspaceError
          message={error}
          retry={() => {
            memberships.reload();
            organizations.reload();
          }}
        />
      ) : memberships.loading || organizations.loading ? (
        <WorkspaceLoading />
      ) : (
        <>
          <section>
            <h2 className="mb-5 text-xl font-semibold">
              Minha participação em projetos
            </h2>
            {memberships.data?.length ? (
              <div className="grid gap-5 md:grid-cols-2">
                {memberships.data.map((membership) => (
                  <article key={membership.id} className="surface">
                    <HeartHandshake className="mb-5 size-6 text-primary" />
                    <Badge variant="secondary" className="mb-3">
                      {membership.member_role === "staff"
                        ? "Equipe do projeto"
                        : "Pessoa assistida"}
                    </Badge>
                    <h3 className="text-xl font-semibold">{membership.name}</h3>
                    <p className="mt-3 flex items-center gap-2 text-sm text-muted-foreground">
                      <MapPin className="size-4" />
                      {membership.city}, {membership.state}
                    </p>
                    <p className="mt-4 text-xs text-muted-foreground">
                      Vínculo registrado em {formatDate(membership.created_at)}
                    </p>
                  </article>
                ))}
              </div>
            ) : (
              <EmptyState
                title="Sem vínculos no momento"
                description="Nenhuma participação foi registrada no seu cadastro. Caso precise corrigir essa informação, fale com o suporte."
                icon={<HeartHandshake className="size-6" />}
                action={
                  <Button asChild variant="outline">
                    <Link href="/painel/suporte">Pedir ajuda ao suporte</Link>
                  </Button>
                }
              />
            )}
          </section>
          {Boolean(organizations.data?.length) && (
            <section className="mt-9">
              <h2 className="mb-2 text-xl font-semibold">
                Organizações associadas
              </h2>
              <p className="mb-5 max-w-2xl text-sm leading-relaxed text-muted-foreground">
                Estes cadastros continuam disponíveis para consulta. Para
                atualizar as informações da organização, entre com uma conta de
                projeto social ou fale com o suporte.
              </p>
              <Button asChild variant="outline" className="mb-5">
                <Link href="/painel/suporte">
                  Solicitar atualização ao suporte
                </Link>
              </Button>
              <div className="grid gap-5 xl:grid-cols-2">
                {organizations.data?.map((organization) => (
                  <OrganizationSummary
                    key={organization.id}
                    organization={organization}
                  />
                ))}
              </div>
            </section>
          )}
        </>
      )}
    </>
  );
}

function InstitutionOrganizations({ donor }: { donor: boolean }) {
  const organizations = useWorkspaceResource<Organization[]>(
    "/api/organizations/mine",
  );
  const catalog = useWorkspaceResource<Catalog>("/api/catalog");
  const [editing, setEditing] = useState<Organization | null>(null);
  const [open, setOpen] = useState(false);
  const error = organizations.error || catalog.error;
  const add = () => {
    setEditing(null);
    setOpen(true);
  };
  return (
    <>
      <WorkspaceHeading
        eyebrow={donor ? "Empresa apoiadora" : "Presença e impacto"}
        title={donor ? "Minha empresa." : "Meus projetos."}
        description={
          donor
            ? "Apresente sua empresa e mantenha as informações de contato atualizadas."
            : "Uma boa apresentação começa com uma história clara. Cuide dos perfis das suas iniciativas."
        }
        action={
          !donor && (
            <Button type="button" onClick={add}>
              <Plus className="size-4" />
              Novo projeto
            </Button>
          )
        }
      />
      {error ? (
        <WorkspaceError
          message={error}
          retry={() => {
            organizations.reload();
            catalog.reload();
          }}
        />
      ) : organizations.loading || catalog.loading ? (
        <WorkspaceLoading />
      ) : organizations.data?.length ? (
        <div className="grid gap-5 xl:grid-cols-2">
          {organizations.data.map((organization) => (
            <OrganizationSummary
              key={organization.id}
              organization={organization}
              edit={() => {
                setEditing(organization);
                setOpen(true);
              }}
            />
          ))}
        </div>
      ) : (
        <EmptyState
          title={
            donor
              ? "Sua empresa ainda não está vinculada"
              : "Seu primeiro projeto começa aqui"
          }
          description={
            donor
              ? "Fale com o suporte para ajudar a localizar ou regularizar o cadastro da empresa."
              : "Apresente o que sua iniciativa faz, quem ela atende e quais mudanças busca gerar."
          }
          icon={<Building2 className="size-6" />}
          action={
            donor ? (
              <Button asChild variant="outline">
                <Link href="/painel/suporte">Falar com o suporte</Link>
              </Button>
            ) : (
              <Button type="button" onClick={add}>
                <Plus className="size-4" />
                Cadastrar projeto
              </Button>
            )
          }
        />
      )}
      {catalog.data && (
        <OrganizationEditor
          key={`${editing?.id ?? "new"}-${open}`}
          organization={editing}
          catalog={catalog.data}
          open={open}
          onOpenChange={setOpen}
          onSaved={() => {
            setOpen(false);
            organizations.reload();
          }}
        />
      )}
      <p className="mt-6 max-w-2xl text-xs leading-relaxed text-muted-foreground">
        O preenchimento indica a quantidade de informações cadastradas. Ele não
        representa uma verificação independente da organização ou de seus
        resultados.
      </p>
    </>
  );
}

function OrganizationSummary({
  organization,
  edit,
}: {
  organization: Organization;
  edit?: () => void;
}) {
  const project = organization.institution_kind === "project";
  return (
    <article className="surface flex flex-col">
      <div className="mb-5 flex items-start justify-between gap-3">
        <div className="flex size-12 items-center justify-center rounded-2xl bg-secondary text-xl font-semibold text-primary">
          {organization.name.slice(0, 1).toUpperCase()}
        </div>
        <div className="flex flex-wrap justify-end gap-2">
          {organization.is_demo && (
            <Badge variant="outline">Demonstração</Badge>
          )}
          <Badge variant="secondary">Informações declaradas</Badge>
        </div>
      </div>
      <p className="mb-2 text-xs text-muted-foreground">
        {organizationLabels[organization.organization_type] ||
          (project ? "Projeto social" : "Empresa")}
      </p>
      <h2 className="text-2xl font-semibold">{organization.name}</h2>
      <p className="mt-3 flex items-center gap-2 text-sm text-muted-foreground">
        <MapPin className="size-4 shrink-0" />
        {organization.city}, {organization.state}
      </p>
      <p className="mt-4 text-sm leading-relaxed text-muted-foreground">
        {organization.short_description}
      </p>
      {organization.areas.length > 0 && (
        <div className="mt-4 flex flex-wrap gap-2">
          {organization.areas.map((area) => (
            <Badge key={area} variant="outline" className="font-normal">
              {areaLabels[area] || area}
            </Badge>
          ))}
        </div>
      )}
      {typeof organization.profile_completeness === "number" && (
        <div className="mt-6">
          <div className="mb-2 flex justify-between gap-3 text-xs">
            <span className="text-muted-foreground">
              Preenchimento do perfil
            </span>
            <span className="font-semibold">
              {organization.profile_completeness}%
            </span>
          </div>
          <Progress
            value={organization.profile_completeness}
            aria-label={`Preenchimento do perfil de ${organization.name}`}
            className="h-1.5"
          />
        </div>
      )}
      <div className="mt-auto flex flex-wrap gap-3 pt-6">
        {edit && (
          <Button type="button" variant="outline" onClick={edit}>
            <Pencil className="size-4" />
            Editar informações
          </Button>
        )}
        {project && (
          <Button variant="ghost" asChild>
            <Link href={`/projetos/${organization.slug}`}>
              Ver perfil público
              <ArrowUpRight className="size-4" />
            </Link>
          </Button>
        )}
      </div>
    </article>
  );
}

function OrganizationEditor({
  organization,
  catalog,
  open,
  onOpenChange,
  onSaved,
}: {
  organization: Organization | null;
  catalog: Catalog;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSaved: () => void;
}) {
  const request = useSessionRequest();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [areas, setAreas] = useState<string[]>(organization?.areas || []);
  const [services, setServices] = useState<string[]>(
    organization?.services
      .filter((service) => service.interested)
      .map((service) => service.code) || [],
  );
  const [organizationType, setOrganizationType] = useState(
    organization?.organization_type || "independent_project",
  );
  const [state, setState] = useState(organization?.state || "");
  const submitLock = useRef(false);
  const isProject =
    !organization || organization.institution_kind === "project";
  const updateSelection = (
    current: string[],
    code: string,
    checked: boolean,
  ) =>
    checked
      ? [...new Set([...current, code])]
      : current.filter((value) => value !== code);
  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (submitLock.current) return;
    setError(null);
    if (!state) {
      setError("Selecione o estado da organização.");
      return;
    }
    if (isProject && !areas.length) {
      setError("Selecione ao menos uma área de atuação para o projeto.");
      return;
    }
    const form = new FormData(event.currentTarget);
    const text = (name: string) => String(form.get(name) || "").trim();
    const optional = (name: string) => text(name) || null;
    const payload = {
      name: text("name"),
      organization_type: organizationType,
      institution_kind: organization?.institution_kind || "project",
      cnpj: optional("cnpj"),
      city: text("city"),
      state,
      founding_year: text("founding_year")
        ? Number(text("founding_year"))
        : null,
      short_description: text("short_description"),
      objective: isProject
        ? optional("objective")
        : (organization?.objective ?? null),
      impact_summary: isProject
        ? optional("impact_summary")
        : (organization?.impact_summary ?? null),
      description: optional("description"),
      website_url: optional("website_url"),
      instagram_url: optional("instagram_url"),
      logo_url: optional("logo_url"),
      pix_key: isProject
        ? optional("pix_key")
        : (organization?.pix_key ?? null),
      areas: isProject ? areas : [],
      interested_services: isProject ? services : [],
    };
    submitLock.current = true;
    setPending(true);
    try {
      await request<Organization>(
        organization
          ? `/api/organizations/${organization.id}`
          : "/api/organizations",
        {
          method: organization ? "PATCH" : "POST",
          body: JSON.stringify(payload),
        },
      );
      toast.success(
        organization
          ? "Informações atualizadas."
          : "Projeto cadastrado com sucesso.",
      );
      onSaved();
    } catch (reason) {
      setError(
        reason instanceof Error
          ? reason.message
          : "Não foi possível salvar a organização.",
      );
    } finally {
      submitLock.current = false;
      setPending(false);
    }
  }
  return (
    <Dialog
      open={open}
      onOpenChange={(value) => {
        if (!pending) onOpenChange(value);
      }}
    >
      <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>
            {organization ? "Editar informações" : "Apresente seu projeto"}
          </DialogTitle>
          <DialogDescription>
            {isProject
              ? "Conte o que sua iniciativa faz. As informações da apresentação serão exibidas no perfil público."
              : "Atualize a apresentação da sua empresa. Os dados de acesso continuam na área Minha conta."}{" "}
            Campos com * são obrigatórios.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={submit} className="mt-3 space-y-7">
          <fieldset className="space-y-5">
            <legend className="mb-4 text-sm font-semibold text-primary">
              1. Sobre a organização
            </legend>
            <div>
              <Label htmlFor="org-name">
                {isProject ? "Nome do projeto" : "Nome da empresa"} *
              </Label>
              <Input
                id="org-name"
                name="name"
                defaultValue={organization?.name}
                required
                minLength={2}
                maxLength={160}
                className="mt-2"
              />
            </div>
            <div className="grid gap-5 sm:grid-cols-2">
              <div>
                <Label htmlFor="org-type">Tipo de organização *</Label>
                <Select
                  value={organizationType}
                  onValueChange={setOrganizationType}
                >
                  <SelectTrigger id="org-type" className="mt-2 w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {catalog.organization_types
                      .filter((type) => !isProject || type.code !== "company")
                      .map((type) => (
                        <SelectItem key={type.code} value={type.code}>
                          {type.label}
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="org-year">Ano de fundação</Label>
                <Input
                  id="org-year"
                  name="founding_year"
                  type="number"
                  min={1800}
                  max={2100}
                  defaultValue={organization?.founding_year || ""}
                  placeholder="Opcional"
                  className="mt-2"
                />
              </div>
            </div>
            <div className="grid gap-5 sm:grid-cols-[1fr_120px]">
              <div>
                <Label htmlFor="org-city">Cidade *</Label>
                <Input
                  id="org-city"
                  name="city"
                  autoComplete="address-level2"
                  defaultValue={organization?.city}
                  required
                  minLength={2}
                  maxLength={100}
                  className="mt-2"
                />
              </div>
              <div>
                <Label htmlFor="org-state">Estado *</Label>
                <Select value={state} onValueChange={setState}>
                  <SelectTrigger id="org-state" className="mt-2 w-full">
                    <SelectValue placeholder="UF" />
                  </SelectTrigger>
                  <SelectContent>
                    {brazilStates.map((uf) => (
                      <SelectItem key={uf} value={uf}>
                        {uf}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <Label htmlFor="org-short">
                Apresentação em poucas palavras *
              </Label>
              <Textarea
                id="org-short"
                name="short_description"
                defaultValue={organization?.short_description}
                required
                minLength={10}
                maxLength={280}
                rows={3}
                className="mt-2"
              />
              <p className="mt-2 text-xs text-muted-foreground">
                Até 280 caracteres. Explique de forma simples o que vocês fazem.
              </p>
            </div>
            <div>
              <Label htmlFor="org-description">
                {isProject ? "História e atuação" : "Sobre a empresa"}
              </Label>
              <Textarea
                id="org-description"
                name="description"
                defaultValue={organization?.description || ""}
                maxLength={5000}
                rows={4}
                className="mt-2"
              />
            </div>
            {isProject && (
              <>
                <div>
                  <Label htmlFor="org-objective">Objetivos do projeto *</Label>
                  <Textarea
                    id="org-objective"
                    name="objective"
                    defaultValue={organization?.objective || ""}
                    required
                    maxLength={2000}
                    rows={3}
                    placeholder="Quais mudanças o projeto busca realizar?"
                    className="mt-2"
                  />
                </div>
                <div>
                  <Label htmlFor="org-impact">
                    Resultados e impacto relatados *
                  </Label>
                  <Textarea
                    id="org-impact"
                    name="impact_summary"
                    defaultValue={organization?.impact_summary || ""}
                    required
                    maxLength={2000}
                    rows={3}
                    placeholder="Conte os resultados já alcançados ou a atuação atual."
                    className="mt-2"
                  />
                  <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
                    Essas informações serão identificadas como declaradas pelo
                    projeto.
                  </p>
                </div>
              </>
            )}
          </fieldset>
          {isProject && (
            <fieldset>
              <legend className="mb-4 text-sm font-semibold text-primary">
                2. Áreas de atuação *
              </legend>
              <div className="grid gap-3 sm:grid-cols-2">
                {catalog.areas.map((area) => (
                  <div
                    key={area.code}
                    className="flex items-start gap-2.5 rounded-lg border p-3"
                  >
                    <Checkbox
                      id={`area-${area.code}`}
                      checked={areas.includes(area.code)}
                      onCheckedChange={(checked) =>
                        setAreas(
                          updateSelection(areas, area.code, checked === true),
                        )
                      }
                    />
                    <Label
                      htmlFor={`area-${area.code}`}
                      className="cursor-pointer text-sm leading-snug font-normal"
                    >
                      {area.label}
                    </Label>
                  </div>
                ))}
              </div>
            </fieldset>
          )}
          <fieldset className="space-y-5">
            <legend className="mb-4 text-sm font-semibold text-primary">
              {isProject ? "3" : "2"}. Links e contato público
            </legend>
            <div>
              <Label htmlFor="org-website">Site</Label>
              <Input
                id="org-website"
                name="website_url"
                type="url"
                defaultValue={organization?.website_url || ""}
                placeholder="https://"
                maxLength={500}
                className="mt-2"
              />
            </div>
            <div>
              <Label htmlFor="org-instagram">Instagram</Label>
              <Input
                id="org-instagram"
                name="instagram_url"
                type="url"
                defaultValue={organization?.instagram_url || ""}
                placeholder="https://instagram.com/seu-perfil"
                maxLength={500}
                className="mt-2"
              />
            </div>
            <div>
              <Label htmlFor="org-logo">Link do logotipo</Label>
              <Input
                id="org-logo"
                name="logo_url"
                type="url"
                defaultValue={organization?.logo_url || ""}
                placeholder="https://…"
                maxLength={500}
                className="mt-2"
              />
            </div>
          </fieldset>
          <fieldset className="space-y-5 rounded-xl border bg-muted/30 p-4">
            <legend className="px-1 text-sm font-semibold">
              Dados privados
            </legend>
            <p className="text-xs leading-relaxed text-muted-foreground">
              CNPJ e chave Pix não são exibidos no perfil público. A plataforma
              ainda não processa doações.
            </p>
            <div>
              <Label htmlFor="org-cnpj">
                CNPJ {isProject && "(se houver)"}
              </Label>
              <Input
                id="org-cnpj"
                name="cnpj"
                inputMode="numeric"
                defaultValue={organization?.cnpj || ""}
                readOnly={Boolean(organization?.cnpj)}
                maxLength={18}
                className="mt-2 read-only:bg-muted"
              />
            </div>
            {isProject && (
              <div>
                <Label htmlFor="org-pix">
                  Chave Pix{" "}
                  <span className="font-normal text-muted-foreground">
                    (opcional)
                  </span>
                </Label>
                <Input
                  id="org-pix"
                  name="pix_key"
                  defaultValue={organization?.pix_key || ""}
                  maxLength={160}
                  className="mt-2"
                />
              </div>
            )}
          </fieldset>
          {isProject && (
            <fieldset>
              <legend className="mb-2 text-sm font-semibold">
                Recursos de interesse
              </legend>
              <p className="mb-4 text-xs leading-relaxed text-muted-foreground">
                Marque o que seria útil para o projeto. Esta seleção apenas
                registra interesse; recursos futuros ainda não estão
                disponíveis.
              </p>
              <div className="grid gap-3 sm:grid-cols-2">
                {catalog.services.map((service) => (
                  <div
                    key={service.code}
                    className="flex items-start gap-2.5 rounded-lg border p-3"
                  >
                    <Checkbox
                      id={`service-${service.code}`}
                      checked={services.includes(service.code)}
                      onCheckedChange={(checked) =>
                        setServices(
                          updateSelection(
                            services,
                            service.code,
                            checked === true,
                          ),
                        )
                      }
                    />
                    <Label
                      htmlFor={`service-${service.code}`}
                      className="cursor-pointer text-sm leading-snug font-normal"
                    >
                      {service.label}
                      <span className="mt-1 block text-xs text-muted-foreground">
                        {service.status === "available"
                          ? "Disponível"
                          : "Recurso futuro"}
                      </span>
                    </Label>
                  </div>
                ))}
              </div>
            </fieldset>
          )}
          <FormError message={error} />
          <div className="flex flex-wrap justify-end gap-3 border-t pt-5">
            <Button
              type="button"
              variant="outline"
              disabled={pending}
              onClick={() => onOpenChange(false)}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={pending}>
              <Save className="size-4" />
              {pending
                ? "Salvando…"
                : organization
                  ? "Salvar alterações"
                  : "Cadastrar projeto"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
