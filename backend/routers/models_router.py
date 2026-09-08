from fastapi import APIRouter

import pricing
import schemas

router = APIRouter(tags=["models"])


@router.get("/models", response_model=list[schemas.ModelOut])
def list_models():
    return [
        schemas.ModelOut(
            provider=info.provider,
            name=info.name,
            display_name=info.display_name,
            input_price_per_million=info.input_price_per_million,
            output_price_per_million=info.output_price_per_million,
            context_window=info.context_window,
            retired=info.retired,
        )
        for info in pricing.all_models()
    ]
