import React from "react";
import { Button, Form, Input } from "../lib/Elements";

export const LoginForm = ({ onSubmit }) => {
  return (
    <Form onSubmit={onSubmit}>
      <label>
        User
        <Input name="user"></Input>
      </label>
      <label>
        Password<Input name="password" type="password"></Input>
      </label>
      <Button>Login</Button>
    </Form>
  );
};
