import { createFormHook } from "@tanstack/react-form";

import {
	Select,
	Slider,
	SubscribeButton,
	Switch,
	TextArea,
	TextField,
} from "../components/FormComponents";
import { fieldContext, formContext } from "./form-context";

export const { useAppForm } = createFormHook({
	fieldComponents: {
		TextField,
		Select,
		TextArea,
		Slider,
		Switch,
	},
	formComponents: {
		SubscribeButton,
	},
	fieldContext,
	formContext,
});
