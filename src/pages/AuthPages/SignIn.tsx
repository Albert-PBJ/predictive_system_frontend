import PageMeta from "../../components/common/PageMeta";
import AuthLayout from "./AuthPageLayout";
import SignInForm from "../../components/auth/SignInForm";

export default function SignIn() {
  return (
    <>
      <PageMeta
        title="Iniciar sesión"
        description="Iniciar sesión en el sistema"
      />
      <AuthLayout>
        <SignInForm />
      </AuthLayout>
    </>
  );
}
