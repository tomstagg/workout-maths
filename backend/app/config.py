from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    database_url: str
    app_env: str = "development"
    secret_key: str
    admin_username: str = "admin"
    admin_password: str = "changeme"
    jwt_algorithm: str = "HS256"
    jwt_expire_minutes: int = 10080


settings = Settings()
