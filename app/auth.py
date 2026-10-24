from fastapi import Depends, HTTPException
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy import select

from app.database import connect
from app.models import users
from app.security import read_token


bearer = HTTPBearer(auto_error=False)


def current_user(credentials: HTTPAuthorizationCredentials | None = Depends(bearer)):
    if credentials is None:
        raise HTTPException(status_code=401, detail="Entre na sua conta para continuar.")
    user_id = read_token(credentials.credentials)
    if user_id is None:
        raise HTTPException(status_code=401, detail="Sua sessão expirou. Entre novamente.")
    with connect() as db:
        row = db.execute(select(
            users.c.id, users.c.full_name, users.c.username, users.c.email, users.c.phone,
            users.c.title.label("responsible_title"), users.c.role, users.c.document,
            users.c.account_type, users.c.registration_number, users.c.created_at,
        ).where(users.c.id == user_id)).mappings().first()
        if row is None:
            raise HTTPException(status_code=401, detail="Conta não encontrada.")
        return dict(row)


def moderator(user=Depends(current_user)):
    if user["role"] != "moderator":
        raise HTTPException(status_code=403, detail="Esta área está disponível apenas para moderação.")
    return user
