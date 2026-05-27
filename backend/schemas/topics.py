from pydantic import BaseModel, field_validator


class NewTopicRequest(BaseModel):
    title: str
    domain: str

    @field_validator("title", "domain")
    @classmethod
    def not_blank(cls, v: str) -> str:
        v = v.strip()
        if not v:
            raise ValueError("must not be blank")
        return v
