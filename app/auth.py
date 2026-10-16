from fastapi import Depends, HTTPException
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer

from app.database import connect
from app.security import read_token


bearer = HTTPBearer(auto_error=False)


def current_user(credentials: HTTPAuthorizationCredentials | None = Depends(bearer)):
    if credentials is None:
        raise HTTPException(status_code=401, detail="Entre na sua conta para continuar.")
    user_id = read_token(credentials.credentials)
    if user_id is None:
        raise HTTPException(status_code=401, detail="Sua sessão expirou. Entre novamente.")
    db = connect()
    try:
        row = db.execute("SELECT id, full_name, username, email, phone, title AS responsible_title, role, document, account_type, registration_number, created_at FROM users WHERE id=?", (user_id,)).fetchone()
        if row is None:
            raise HTTPException(status_code=401, detail="Conta não encontrada.")
        return dict(row)
    finally:
        db.close()


def moderator(user=Depends(current_user)):
    if user["role"] != "moderator":
        raise HTTPException(status_code=403, detail="Esta área está disponível apenas para moderação.")
    return user
