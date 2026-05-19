from fastapi import APIRouter, Depends

from backend.auth import get_current_user
from backend.database.models import User

router = APIRouter()


@router.get("/me")
async def get_me(user: User = Depends(get_current_user)):
    return {
        "user": {
            "id": str(user.id),
            "email": user.email,
            "display_name": user.display_name,
            "picture_url": user.picture_url,
        }
    }
