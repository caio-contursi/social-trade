"""The original 11 organization regression scenarios, now run by pytest.

Database/environment isolation is shared with the wider suite in conftest.py.
"""

import unittest
import pytest

from fastapi.testclient import TestClient
from sqlalchemy import insert


PASSWORD = "LocalTestPassword123!"
PUBLIC_FIELDS = {
    "id", "name", "slug", "organization_type", "city", "state", "founding_year",
    "short_description", "objective", "impact_summary", "description", "website_url",
    "instagram_url", "logo_url", "created_at", "areas", "verification_status",
    "profile_completeness", "is_demo", "pix_donations_available",
}


@pytest.fixture(scope="module", autouse=True)
def legacy_globals(api, password_hash):
    globals()["api_module"] = api
    globals()["password_hash"] = password_hash


def organization_payload(kind="project", **overrides):
    data = {
        "name": "Projeto de teste", "organization_type": "independent_project" if kind == "project" else "association",
        "institution_kind": kind, "cnpj": "11222333000181", "city": "São Paulo", "state": "SP",
        "founding_year": 2020, "short_description": "Educação e alimentação para a comunidade.",
        "objective": "Ampliar o acesso à educação." if kind == "project" else None,
        "impact_summary": "Cinquenta famílias atendidas no período." if kind == "project" else None,
        "description": None, "website_url": None, "instagram_url": None,
        "pix_key": "private-pix-value", "logo_url": None,
        "areas": ["education", "food"] if kind == "project" else [],
        "interested_services": ["public_profile"],
    }
    data.update(overrides)
    return data


class OrganizationApiTests(unittest.TestCase):
    def setUp(self):
        self.client = TestClient(api_module.app)
        self.owner = self.create_user("owner@example.org", "project", "11222333000181")
        self.other = self.create_user("other@example.org", "project", "11444777000161")
        self.donor = self.create_user("donor@example.org", "donor", "12345678000195")
        self.person = self.create_user("person@example.org", "person", "52998224725")
        with api_module.transaction() as db:
            self.project_id = api_module.create_org(db, self.owner, organization_payload())
            self.donor_id = api_module.create_org(db, self.donor, organization_payload("donor", name="Empresa de teste"))
        self.owner_headers = self.login("11222333000181", "project")
        self.donor_headers = self.login("12345678000195", "donor")

    def tearDown(self):
        self.client.close()

    def create_user(self, email, kind, document):
        with api_module.transaction() as db:
            return db.execute(insert(api_module.users).values(
                full_name="Pessoa de teste", username=document, email=email, password_hash=password_hash,
                document=document, account_type=kind, registration_number="000001" if kind == "person" else None,
            ).returning(api_module.users.c.id)).scalar_one()

    def login(self, document, kind):
        response = self.client.post("/api/auth/login", json={"document": document, "password": PASSWORD, "account_type": kind})
        self.assertEqual(response.status_code, 200, response.text)
        return {"Authorization": "Bearer " + response.json()["access_token"]}

    def current_project(self):
        response = self.client.get("/api/organizations/mine", headers=self.owner_headers)
        self.assertEqual(response.status_code, 200)
        return response.json()[0]

    def test_public_discovery_is_anonymous_and_does_not_expose_private_data(self):
        response = self.client.get("/api/public/projects")
        self.assertEqual(response.status_code, 200)
        projects = response.json()
        self.assertEqual([project["id"] for project in projects], [self.project_id])
        self.assertEqual(set(projects[0]), PUBLIC_FIELDS)
        self.assertEqual(projects[0]["verification_status"], "self_declared")
        self.assertEqual(projects[0]["areas"], ["education", "food"])
        for private_value in ("owner@example.org", "11222333000181", "private-pix-value", password_hash):
            self.assertNotIn(private_value, response.text)
        private_fields = {"owner_id", "owner_email", "email", "document", "cnpj", "pix_key", "password_hash"}
        self.assertFalse(private_fields.intersection(projects[0]))
        self.assertEqual(self.client.get("/api/projects").status_code, 401)
        self.assertEqual(self.client.get("/api/projects", headers=self.owner_headers).status_code, 403)
        donor_response = self.client.get("/api/projects", headers=self.donor_headers)
        self.assertEqual(donor_response.status_code, 200)
        self.assertEqual(donor_response.json(), projects)

    def test_public_profile_includes_declared_impact_and_consistent_metadata(self):
        own = self.current_project()
        response = self.client.get("/api/public/organizations/" + own["slug"])
        self.assertEqual(response.status_code, 200)
        public = response.json()
        self.assertEqual(set(public), PUBLIC_FIELDS | {"services"})
        self.assertEqual(public["objective"], organization_payload()["objective"])
        self.assertEqual(public["impact_summary"], organization_payload()["impact_summary"])
        listed = self.client.get("/api/public/projects").json()[0]
        for field in ("verification_status", "profile_completeness", "is_demo", "pix_donations_available"):
            self.assertEqual(public[field], own[field])
            self.assertEqual(public[field], listed[field])
        self.assertEqual(public["verification_status"], "self_declared")
        self.assertIs(type(public["profile_completeness"]), int)
        self.assertGreaterEqual(public["profile_completeness"], 0)
        self.assertLess(public["profile_completeness"], 100)
        self.assertNotIn("owner_email", own)
        self.assertEqual(self.client.get("/api/public/organizations/missing-project").status_code, 404)

    def test_owner_can_replace_profile_and_relationships_without_changing_slug(self):
        original = self.current_project()
        payload = organization_payload(
            name="  Novo nome público  ", objective="Objetivo atualizado.", impact_summary="Resultados atualizados.",
            areas=["health", "health"], interested_services=["accountability", "accountability"],
            website_url="https://example.org", logo_url="https://example.org/logo.png", description="Nossa história e atuação.",
        )
        response = self.client.patch(f"/api/organizations/{self.project_id}", headers=self.owner_headers, json=payload)
        self.assertEqual(response.status_code, 200, response.text)
        updated = response.json()
        self.assertEqual(updated["name"], "Novo nome público")
        self.assertEqual(updated["slug"], original["slug"])
        self.assertEqual(updated["owner_id"], self.owner)
        self.assertEqual(updated["institution_kind"], "project")
        self.assertEqual(updated["areas"], ["health"])
        self.assertEqual([item["code"] for item in updated["services"] if item["interested"]], ["accountability"])
        self.assertEqual(updated["profile_completeness"], 100)
        self.assertEqual(updated["verification_status"], "self_declared")
        public = self.client.get("/api/public/organizations/" + original["slug"]).json()
        self.assertEqual(public["objective"], payload["objective"])
        self.assertEqual(public["impact_summary"], payload["impact_summary"])
        self.assertEqual(public["profile_completeness"], 100)

    def test_edit_requires_authenticated_owner_and_matching_account_type(self):
        endpoint = f"/api/organizations/{self.project_id}"
        payload = organization_payload(name="Nome que não deve ser salvo")
        self.assertEqual(self.client.patch(endpoint, json=payload).status_code, 401)
        other_headers = self.login("11444777000161", "project")
        for headers in (other_headers, self.donor_headers, self.login("52998224725", "project")):
            with self.subTest(headers_owner=headers == self.owner_headers):
                self.assertEqual(self.client.patch(endpoint, headers=headers, json=payload).status_code, 403)
        with api_module.transaction() as db:
            legacy_id = api_module.create_org(db, self.person, organization_payload(name="Projeto legado"))
        self.assertEqual(self.client.patch(f"/api/organizations/{legacy_id}", headers=self.login("52998224725", "project"), json=payload).status_code, 403)
        self.assertEqual(self.current_project()["name"], "Projeto de teste")
        self.assertEqual(self.client.patch("/api/organizations/999999", headers=self.owner_headers, json=payload).status_code, 404)

    def test_cannot_change_institution_kind_or_protected_fields(self):
        endpoint = f"/api/organizations/{self.project_id}"
        changed_kind = organization_payload("donor", organization_type="company")
        self.assertEqual(self.client.patch(endpoint, headers=self.owner_headers, json=changed_kind).status_code, 422)
        for protected, value in (("owner_id", self.other), ("slug", "hijacked"), ("id", 99), ("is_demo", True), ("verification_status", "verified")):
            with self.subTest(field=protected):
                payload = organization_payload(**{protected: value})
                self.assertEqual(self.client.patch(endpoint, headers=self.owner_headers, json=payload).status_code, 422)
        current = self.current_project()
        self.assertEqual(current["owner_id"], self.owner)
        self.assertEqual(current["institution_kind"], "project")
        self.assertFalse(current["is_demo"])
        self.assertEqual(current["verification_status"], "self_declared")

    def test_invalid_edits_are_rejected_without_partial_updates(self):
        invalid_values = (
            {"areas": ["unknown-cause"]}, {"interested_services": ["unknown-service"]},
            {"state": "XX"}, {"organization_type": "company"}, {"organization_type": "unknown"},
            {"areas": []}, {"name": " a "}, {"city": "   "}, {"short_description": "   short  "},
            {"website_url": "javascript:alert(1)"}, {"cnpj": "11111111111111"},
        )
        original = self.current_project()
        for invalid in invalid_values:
            with self.subTest(invalid=invalid):
                payload = organization_payload(**{"name": "Nome que não deve ser salvo", **invalid})
                response = self.client.patch(f"/api/organizations/{self.project_id}", headers=self.owner_headers, json=payload)
                self.assertEqual(response.status_code, 422, response.text)
                self.assertEqual(self.current_project(), original)
        self.assertEqual(self.client.patch(f"/api/organizations/{self.project_id}", headers=self.owner_headers, json={"name": "Sem o restante do perfil"}).status_code, 422)

    def test_donor_can_edit_company_and_legacy_association(self):
        for organization_type in ("company", "association"):
            with self.subTest(organization_type=organization_type):
                payload = organization_payload("donor", organization_type=organization_type, name="Empresa atualizada")
                response = self.client.patch(f"/api/organizations/{self.donor_id}", headers=self.donor_headers, json=payload)
                self.assertEqual(response.status_code, 200, response.text)
                self.assertEqual(response.json()["institution_kind"], "donor")
                self.assertEqual(response.json()["organization_type"], organization_type)
        self.assertNotIn(self.donor_id, [item["id"] for item in self.client.get("/api/public/projects").json()])

    def test_demo_flag_comes_only_from_exact_owner_email_domain(self):
        demo_owner = self.create_user("demo@SocialTrade.Local", "project", "19000000000001")
        near_owner = self.create_user("demo@socialtrade.local.example.org", "project", "19000000000002")
        with api_module.transaction() as db:
            demo_id = api_module.create_org(db, demo_owner, organization_payload(name="Instituição sem nome de demo"))
            near_id = api_module.create_org(db, near_owner, organization_payload(name="Projeto demo SocialTrade"))
        projects = {item["id"]: item for item in self.client.get("/api/public/projects").json()}
        self.assertTrue(projects[demo_id]["is_demo"])
        self.assertFalse(projects[near_id]["is_demo"])
        self.assertFalse(projects[self.project_id]["is_demo"])
        public = self.client.get("/api/public/organizations/" + projects[demo_id]["slug"]).json()
        self.assertTrue(public["is_demo"])

    def test_existing_login_session_and_wrong_credentials(self):
        response = self.client.get("/api/auth/me", headers=self.owner_headers)
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json()["id"], self.owner)
        self.assertEqual(response.json()["account_type"], "project")
        for document, password, kind, expected in (
            ("11222333000181", "wrong-password", "project", 401),
            ("99999999999999", PASSWORD, "project", 401),
            ("11222333000181", PASSWORD, "donor", 403),
            ("12345678000195", PASSWORD, "project", 403),
        ):
            with self.subTest(kind=kind, expected=expected):
                self.assertEqual(self.client.post("/api/auth/login", json={"document": document, "password": password, "account_type": kind}).status_code, expected)

    def test_catalog_exposes_demo_state_and_company_type(self):
        response = self.client.get("/api/catalog")
        self.assertEqual(response.status_code, 200)
        self.assertFalse(response.json()["demo_users_enabled"])
        self.assertIn({"code": "company", "label": "Empresa"}, response.json()["organization_types"])

    def test_registration_accepts_company_for_donors_and_rejects_it_for_projects(self):
        payload = {
            "full_name": "Responsável da empresa", "document": "04252011000110",
            "responsible_cpf": "52998224725",
            "email": "new-company@example.org", "password": PASSWORD, "password_confirmation": PASSWORD,
            "institution_kind": "donor", "organization": organization_payload("donor", organization_type="company"),
        }
        response = self.client.post("/api/auth/register-institution", json=payload)
        self.assertEqual(response.status_code, 201, response.text)
        headers = self.login(payload["document"], "donor")
        company = self.client.get("/api/organizations/mine", headers=headers).json()[0]
        self.assertEqual(company["organization_type"], "company")
        self.assertEqual(company["institution_kind"], "donor")
        self.assertFalse(company["is_demo"])
        invalid = {**payload, "document": "11444777000161", "email": "invalid-project@example.org", "institution_kind": "project"}
        invalid["organization"] = organization_payload("project", organization_type="company")
        self.assertEqual(self.client.post("/api/auth/register-institution", json=invalid).status_code, 422)
        self.assertEqual(self.client.post("/api/organizations", headers=self.owner_headers, json=payload["organization"]).status_code, 422)


if __name__ == "__main__":
    unittest.main()
