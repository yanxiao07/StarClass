from pydantic import BaseModel, EmailStr, Field

class LoginRequest(BaseModel):
    email: EmailStr = Field(..., description="用户邮箱")
    password: str = Field(..., min_length=6, description="用户密码")

class RegisterRequest(BaseModel):
    email: EmailStr = Field(..., description="用户邮箱")
    password: str = Field(..., min_length=6, description="用户密码")
    name: str = Field(..., min_length=1, max_length=100, description="用户姓名")
    role: str = Field("student", pattern="^(student|teacher)$", description="角色")
    nickname: str = Field(None, max_length=100, description="昵称")

class TokenResponse(BaseModel):
    access_token: str = Field(..., description="访问令牌")
    refresh_token: str = Field(..., description="刷新令牌")
    token_type: str = Field("bearer", description="令牌类型")
    user_id: str = Field(..., description="用户ID")
    role: str = Field(..., description="用户角色")

class RefreshTokenRequest(BaseModel):
    refresh_token: str = Field(..., description="刷新令牌")