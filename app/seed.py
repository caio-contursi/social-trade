"""Explicit, additive demo data: python -m app.seed --environment development."""
import argparse

DEMO_PROJECT_CNPJ = "90000001000129"
DEMO_PROJECT_PIX_KEY = "projeto-pix@example.test"


def seed_demo_users(*, environment: str) -> None:
    if environment not in {"development", "test"}:
        raise ValueError("O seed só pode ser executado explicitamente em desenvolvimento ou teste.")

    from sqlalchemy import func, insert, or_, select, update
    from app.database import transaction
    from app.main import create_org, generate_registration_number
    from app.models import announcements, organizations, project_memberships, users
    from app.security import hash_password

    demo_users = [
        ("Usuário Um", "user1@socialtrade.local", "user1", "member", "11111111111", "person"),
        ("Usuário Dois", "user2@socialtrade.local", "user2", "member", "22222222222", "person"),
        ("Moderador", "mod@socialtrade.local", "mod", "moderator", "33333333333", "person"),
        ("Voluntário", "voluntario@socialtrade.local", "voluntario", "volunteer", "44444444444", "person"),
        ("Empresa Doadora", "doador@socialtrade.local", "doador", "member", "12345678000195", "donor"),
        ("Projeto de Teste Pix", "projeto-pix@socialtrade.local", "projeto_pix", "member", DEMO_PROJECT_CNPJ, "project"),
    ]
    with transaction() as db:
        for name, email, username, role, document, account_type in demo_users:
            legacy_email = email.replace("@socialtrade.local", "@impactledger.local")
            exists = db.execute(select(users.c.id).where(or_(
                func.lower(users.c.email).in_([email, legacy_email]),
                func.lower(users.c.username) == username, users.c.document == document,
            ))).first()
            if exists:
                # Do not change credentials, role, document, profile or memberships.
                # Only fill the reserved test Pix key on this exact demo profile
                # when it is still empty; a moderator must approve it separately.
                if username == "projeto_pix":
                    demo_project = db.execute(select(organizations.c.id, organizations.c.pix_key).where(
                        organizations.c.owner_id == exists[0],
                        organizations.c.slug == "projeto-de-teste-pix",
                        organizations.c.institution_kind == "project",
                    )).mappings().first()
                    if demo_project and not demo_project["pix_key"]:
                        db.execute(update(organizations).where(
                            organizations.c.id == demo_project["id"],
                            organizations.c.pix_key.is_(None),
                        ).values(pix_key=DEMO_PROJECT_PIX_KEY))
                continue
            user_id = db.execute(insert(users).values(
                full_name=name, username=username, email=email, password_hash=hash_password("SocialTrade123!"),
                role=role, document=document, account_type=account_type,
                registration_number=generate_registration_number(db) if account_type == "person" else None,
            ).returning(users.c.id)).scalar_one()
            if username == "user1":
                org_id = create_org(db, user_id, {
                    "name": "Instituto Mãos Unidas", "organization_type": "independent_project", "cnpj": None,
                    "institution_kind": "project", "objective": "Ampliar o acesso de famílias a alimentação e educação.",
                    "impact_summary": "Distribuição mensal de cestas e oficinas para crianças e adolescentes.",
                    "city": "São Paulo", "state": "SP", "founding_year": 2021,
                    "short_description": "Apoio comunitário e distribuição de alimentos para famílias da região.",
                    "description": "Uma iniciativa local que aproxima doações de quem mais precisa.",
                    "areas": ["food", "education"], "interested_services": ["public_profile", "campaigns"],
                })
                db.execute(insert(project_memberships).values(user_id=user_id, organization_id=org_id, member_role="staff"))
            elif username == "doador":
                create_org(db, user_id, {
                    "name": "Empresa Doadora Exemplo", "organization_type": "association", "institution_kind": "donor",
                    "cnpj": document, "city": "São Paulo", "state": "SP",
                    "short_description": "Empresa que investe em projetos sociais com transparência.",
                    "description": "Conta de demonstração de empresa apoiadora.", "areas": [], "interested_services": [],
                })
            elif username == "projeto_pix":
                create_org(db, user_id, {
                    "name": "Projeto de Teste Pix", "organization_type": "independent_project",
                    "institution_kind": "project", "cnpj": document, "city": "São Paulo", "state": "SP",
                    "founding_year": 2024,
                    "short_description": "Perfil fictício para testar doações diretas por Pix em ambiente local.",
                    "objective": "Validar o fluxo técnico de doação direta sem movimentar fundos pela plataforma.",
                    "impact_summary": "Projeto exclusivamente demonstrativo; não representa uma iniciativa beneficiária real.",
                    "description": "Projeto, CNPJ e chave Pix fictícios para simular o fluxo em desenvolvimento e testes. Não faça transferências reais.",
                    "pix_key": DEMO_PROJECT_PIX_KEY,
                    "areas": ["technology"], "interested_services": ["public_profile"],
                })
        if not db.execute(select(announcements.c.id).limit(1)).first():
            db.execute(insert(announcements), [
                {"title": "Bem-vindo ao SocialTrade", "body": "Acesse avisos e mantenha seu perfil atualizado.", "category": "novidade"},
                {"title": "Complete seu perfil", "body": "Adicione uma organização e suas áreas de atuação.", "category": "dica"},
                {"title": "Atualizações da plataforma", "body": "Novas funcionalidades e informações do sistema.", "category": "plataforma"},
            ])


def main() -> None:
    parser = argparse.ArgumentParser(description="Cria dados fictícios sem alterar registros existentes.")
    parser.add_argument("--environment", required=True, choices=("development", "test"))
    args = parser.parse_args()
    seed_demo_users(environment=args.environment)
    print("Seed explícito concluído; registros existentes preservados.")


if __name__ == "__main__":
    main()
