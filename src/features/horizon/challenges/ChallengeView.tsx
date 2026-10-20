import React from 'react';
import type { Challenge } from '../../../content/types';
import { MediaView } from './MediaView';
import { McqInput, TrueFalseInput, TextInput, NumberInput } from './BasicInputs';
import { OrderInput } from './OrderInput';
import { PasswordInput } from './PasswordInput';
import { CrosswordInput } from './CrosswordInput';
import { WordSearchInput } from './WordSearchInput';
import { ObservationInput } from './ObservationInput';
import type { ChallengeInputProps } from './shared';

/** موزع واحد لكل الآليات: إضافة نوع جديد = إضافة مكون إدخال هنا فقط، لا مكون لكل مرحلة. */
export function ChallengeView(props: ChallengeInputProps) {
  const { challenge } = props;
  return (
    <div className="flex flex-col gap-4">
      {challenge.media && <MediaView media={challenge.media} />}
      <ChallengeInput {...props} />
    </div>
  );
}

function ChallengeInput(props: ChallengeInputProps) {
  const c = props.challenge as Challenge;
  switch (c.kind) {
    case 'mcq':
      return <McqInput {...props} challenge={c} />;
    case 'truefalse':
      return <TrueFalseInput {...props} challenge={c} />;
    case 'text':
      return <TextInput {...props} challenge={c} />;
    case 'number':
      return <NumberInput {...props} challenge={c} />;
    case 'order':
      return <OrderInput {...props} challenge={c} />;
    case 'password':
      return <PasswordInput {...props} challenge={c} />;
    case 'crossword':
      return <CrosswordInput {...props} challenge={c} />;
    case 'wordsearch':
      return <WordSearchInput {...props} challenge={c} />;
    case 'observation':
      return <ObservationInput {...props} challenge={c} />;
  }
}
