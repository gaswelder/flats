import styled from "styled-components";

export const styles = {
  sheet: `
    background: rgba(255, 255, 255, 0.9);
    padding: 10px;
    border-radius: 4px;
  `,
};

export const Form = styled.form`
  padding: 16px;
  max-width: 350px;
  & label {
    display: flex;
    flex-direction: column;
    margin: 0.5em 0;
  }
`;

export const Input = styled.input`
  padding: 4px;
`;

export const Button = styled.button`
  padding: 4px;
  & + & {
    margin-left: 4px;
  }
`;
